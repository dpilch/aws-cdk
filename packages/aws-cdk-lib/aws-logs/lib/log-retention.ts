import * as path from 'path';
import { Construct } from 'constructs';
import { RetentionDays } from './log-group';
import * as iam from '../../aws-iam';
import * as s3_assets from '../../aws-s3-assets';
import * as cdk from '../../core';
import { ArnFormat } from '../../core';
import { FactName } from '../../region-info';

/**
 * Construction properties for a LogRetention.
 */
export interface LogRetentionProps {
  /**
   * The log group name.
   */
  readonly logGroupName: string;

  /**
   * The region where the log group should be created
   * @default - same region as the stack
   */
  readonly logGroupRegion?: string;

  /**
   * The number of days log events are kept in CloudWatch Logs.
   */
  readonly retention: RetentionDays;

  /**
   * The IAM role for the Lambda function associated with the custom resource.
   *
   * @default - A new role is created
   */
  readonly role?: iam.IRole;

  /**
   * Retry options for all AWS API calls.
   *
   * @default - AWS SDK default retry options
   */
  readonly logRetentionRetryOptions?: LogRetentionRetryOptions;

  /**
   * The removalPolicy for the log group when the stack is deleted
   * @default RemovalPolicy.RETAIN
   */
  readonly removalPolicy?: cdk.RemovalPolicy;

  /**
   * Whether tags will also be added to the corresponding Cloudwatch log group.
   *
   * @default false
   */
  readonly propagateTags?: boolean;
}

/**
 * Retry options for all AWS API calls.
 */
export interface LogRetentionRetryOptions {
  /**
   * The maximum amount of retries.
   *
   * @default 3 (AWS SDK default)
   */
  readonly maxRetries?: number;
  /**
   * The base duration to use in the exponential backoff for operation retries.
   *
   * @default Duration.millis(100) (AWS SDK default)
   */
  readonly base?: cdk.Duration;
}

/**
 * Creates a custom resource to control the retention policy of a CloudWatch Logs
 * log group. The log group is created if it doesn't already exist. The policy
 * is removed when `retentionDays` is `undefined` or equal to `Infinity`.
 * Log group can be created in the region that is different from stack region by
 * specifying `logGroupRegion`
 */
export class LogRetention extends Construct implements cdk.ITaggable {
  /**
   * The ARN of the LogGroup.
   */
  public readonly logGroupArn: string;

  /**
   * Tags for the LogGroup.
   */
  public readonly tags: cdk.TagManager = new cdk.TagManager(cdk.TagType.KEY_VALUE, 'AWS::Logs::LogGroup');

  constructor(scope: Construct, id: string, props: LogRetentionProps) {
    super(scope, id);

    // Custom resource provider
    const provider = this.ensureSingletonLogRetentionFunction(props);

    // format: arn:aws:logs:<region>:<account-id>:log-group:<log-group-name>
    const logGroupBaseArn = cdk.Stack.of(this).formatArn({
      region: props.logGroupRegion,
      service: 'logs',
      resource: 'log-group',
      resourceName: `${props.logGroupName}`,
      arnFormat: ArnFormat.COLON_RESOURCE_NAME,
    });
    // Append ':*' at the end of the ARN to match with how CloudFormation does this for LogGroup ARNs
    // See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-logs-loggroup.html#aws-resource-logs-loggroup-return-values
    this.logGroupArn = logGroupBaseArn + ':*';

    // if removalPolicy is DESTROY, add action for DeleteLogGroup
    if (props.removalPolicy === cdk.RemovalPolicy.DESTROY) {
      provider.grantDeleteLogGroup(this.logGroupArn);
    }

    // if propagateTags is true, add ListResource, TagResource, and UntagResource actions
    // cloudwatchlogs tagging resource api calls use base arn format and so granting must use the same base arn
    if (props.propagateTags) {
      provider.grantPropagateTagsToLogGroup(logGroupBaseArn);
    }

    // Need to use a CfnResource here to prevent lerna dependency cycles
    // @aws-cdk/aws-cloudformation -> @aws-cdk/aws-lambda -> @aws-cdk/aws-cloudformation
    const retryOptions = props.logRetentionRetryOptions;
    new cdk.CfnResource(this, 'Resource', {
      type: 'Custom::LogRetention',
      properties: {
        ServiceToken: provider.functionArn,
        LogGroupName: props.logGroupName,
        LogGroupArn: logGroupBaseArn,
        LogGroupRegion: props.logGroupRegion,
        SdkRetry: retryOptions ? {
          maxRetries: retryOptions.maxRetries,
          base: retryOptions.base?.toMilliseconds(),
        } : undefined,
        RetentionInDays: props.retention === RetentionDays.INFINITE ? undefined : props.retention,
        RemovalPolicy: props.removalPolicy,
        PropagateTags: props.propagateTags,
        Tags: this.tags.renderedTags,
      },
    });
  }

  /**
   * Helper method to ensure that only one instance of LogRetentionFunction resources are in the stack mimicking the
   * behaviour of @aws-cdk/aws-lambda's SingletonFunction to prevent circular dependencies
   */
  private ensureSingletonLogRetentionFunction(props: LogRetentionProps) {
    const functionLogicalId = 'LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a';
    const existing = cdk.Stack.of(this).node.tryFindChild(functionLogicalId);
    if (existing) {
      return existing as LogRetentionFunction;
    }
    return new LogRetentionFunction(cdk.Stack.of(this), functionLogicalId, props);
  }
}

/**
 * Private provider Lambda function to support the log retention custom resource.
 */
class LogRetentionFunction extends Construct implements cdk.ITaggable {
  public readonly functionArn: cdk.Reference;

  public readonly tags: cdk.TagManager = new cdk.TagManager(cdk.TagType.KEY_VALUE, 'AWS::Lambda::Function');

  private readonly role: iam.IRole;

  constructor(scope: Construct, id: string, props: LogRetentionProps) {
    super(scope, id);

    const asset = new s3_assets.Asset(this, 'Code', {
      path: path.join(__dirname, 'log-retention-provider'),
    });

    const role = props.role || new iam.Role(this, 'ServiceRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });
    // Duplicate statements will be deduplicated by `PolicyDocument`
    role.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ['logs:PutRetentionPolicy', 'logs:DeleteRetentionPolicy'],
      // We need '*' here because we will also put a retention policy on
      // the log group of the provider function. Referencing its name
      // creates a CF circular dependency.
      resources: ['*'],
    }));
    this.role = role;

    // Lambda function
    const resource = new cdk.CfnResource(this, 'Resource', {
      type: 'AWS::Lambda::Function',
      properties: {
        Handler: 'index.handler',
        Runtime: cdk.Stack.of(scope).regionalFact(FactName.DEFAULT_CR_NODE_VERSION, 'nodejs16.x'), // Equivalent to Runtime.NODEJS_16_X
        Code: {
          S3Bucket: asset.s3BucketName,
          S3Key: asset.s3ObjectKey,
        },
        Role: role.roleArn,
        Tags: this.tags.renderedTags,
      },
    });
    this.functionArn = resource.getAtt('Arn');

    asset.addResourceMetadata(resource, 'Code');

    // Function dependencies
    role.node.children.forEach((child) => {
      if (cdk.CfnResource.isCfnResource(child)) {
        resource.addDependency(child);
      }
      if (Construct.isConstruct(child) && child.node.defaultChild && cdk.CfnResource.isCfnResource(child.node.defaultChild)) {
        resource.addDependency(child.node.defaultChild);
      }
    });
  }

  /**
   * @internal
   */
  public grantPropagateTagsToLogGroup(logGroupArn: string) {
    this.role.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: [
        'logs:ListTagsForResource',
        'logs:TagResource',
        'logs:UntagResource',
      ],
      // only propagate tags to the specific log group
      resources: [logGroupArn],
    }));
  }

  /**
   * @internal
   */
  public grantDeleteLogGroup(logGroupArn: string) {
    this.role.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ['logs:DeleteLogGroup'],
      //Only allow deleting the specific log group.
      resources: [logGroupArn],
    }));
  }
}
