import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { CfnTable } from 'aws-cdk-lib/aws-glue';
import * as glue from '../lib';

test('unpartitioned JSON table', () => {
  const app = new cdk.App();
  const dbStack = new cdk.Stack(app, 'db');
  const database = new glue.Database(dbStack, 'Database');

  const tableStack = new cdk.Stack(app, 'table');
  const table = new glue.S3Table(tableStack, 'Table', {
    database,
    columns: [{
      name: 'col',
      type: glue.Schema.STRING,
    }],
    dataFormat: glue.DataFormat.JSON,
  });
  expect(table.encryption).toEqual(glue.TableEncryption.S3_MANAGED);

  Template.fromStack(tableStack).hasResource('AWS::S3::Bucket', {
    Type: 'AWS::S3::Bucket',
    DeletionPolicy: 'Retain',
    UpdateReplacePolicy: 'Retain',
  });

  Template.fromStack(tableStack).hasResourceProperties('AWS::Glue::Table', {
    CatalogId: {
      Ref: 'AWS::AccountId',
    },
    DatabaseName: {
      'Fn::ImportValue': 'db:ExportsOutputRefDatabaseB269D8BB88F4B1C4',
    },
    TableInput: {
      Name: 'tabletable8fff2c2b',
      Description: 'tabletable8fff2c2b generated by CDK',
      Parameters: {
        classification: 'json',
        has_encrypted_data: true,
      },
      StorageDescriptor: {
        Columns: [
          {
            Name: 'col',
            Type: 'string',
          },
        ],
        Compressed: false,
        InputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
        Location: {
          'Fn::Join': [
            '',
            [
              's3://',
              {
                Ref: 'TableBucketDA42407C',
              },
              '/',
            ],
          ],
        },
        OutputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
        SerdeInfo: {
          SerializationLibrary: 'org.openx.data.jsonserde.JsonSerDe',
        },
        StoredAsSubDirectories: false,
      },
      TableType: 'EXTERNAL_TABLE',
    },
  });
});

test('partitioned JSON table', () => {
  const app = new cdk.App();
  const dbStack = new cdk.Stack(app, 'db');
  const database = new glue.Database(dbStack, 'Database');

  const tableStack = new cdk.Stack(app, 'table');
  const table = new glue.S3Table(tableStack, 'Table', {
    database,
    columns: [{
      name: 'col',
      type: glue.Schema.STRING,
    }],
    partitionKeys: [{
      name: 'year',
      type: glue.Schema.SMALL_INT,
    }],
    dataFormat: glue.DataFormat.JSON,
  });
  expect(table.encryption).toEqual(glue.TableEncryption.S3_MANAGED);
  expect(table.encryptionKey).toEqual(undefined);
  expect(table.bucket).not.toEqual(undefined);
  expect(table.bucket?.encryptionKey).toEqual(undefined);

  Template.fromStack(tableStack).hasResourceProperties('AWS::Glue::Table', {
    CatalogId: {
      Ref: 'AWS::AccountId',
    },
    DatabaseName: {
      'Fn::ImportValue': 'db:ExportsOutputRefDatabaseB269D8BB88F4B1C4',
    },
    TableInput: {
      Name: 'tabletable8fff2c2b',
      Description: 'tabletable8fff2c2b generated by CDK',
      Parameters: {
        classification: 'json',
        has_encrypted_data: true,
      },
      PartitionKeys: [
        {
          Name: 'year',
          Type: 'smallint',
        },
      ],
      StorageDescriptor: {
        Columns: [
          {
            Name: 'col',
            Type: 'string',
          },
        ],
        Compressed: false,
        InputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
        Location: {
          'Fn::Join': [
            '',
            [
              's3://',
              {
                Ref: 'TableBucketDA42407C',
              },
              '/',
            ],
          ],
        },
        OutputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
        SerdeInfo: {
          SerializationLibrary: 'org.openx.data.jsonserde.JsonSerDe',
        },
        StoredAsSubDirectories: false,
      },
      TableType: 'EXTERNAL_TABLE',
    },
  });
});

test('compressed table', () => {
  const stack = new cdk.Stack();
  const database = new glue.Database(stack, 'Database');

  const table = new glue.S3Table(stack, 'Table', {
    database,
    columns: [{
      name: 'col',
      type: glue.Schema.STRING,
    }],
    compressed: true,
    dataFormat: glue.DataFormat.JSON,
  });
  expect(table.encryptionKey).toEqual(undefined);
  expect(table.bucket?.encryptionKey).toEqual(undefined);

  Template.fromStack(stack).hasResourceProperties('AWS::Glue::Table', {
    CatalogId: {
      Ref: 'AWS::AccountId',
    },
    DatabaseName: {
      Ref: 'DatabaseB269D8BB',
    },
    TableInput: {
      Name: 'table',
      Description: 'table generated by CDK',
      Parameters: {
        classification: 'json',
        has_encrypted_data: true,
      },
      StorageDescriptor: {
        Columns: [
          {
            Name: 'col',
            Type: 'string',
          },
        ],
        Compressed: true,
        InputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
        Location: {
          'Fn::Join': [
            '',
            [
              's3://',
              {
                Ref: 'TableBucketDA42407C',
              },
              '/',
            ],
          ],
        },
        OutputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
        SerdeInfo: {
          SerializationLibrary: 'org.openx.data.jsonserde.JsonSerDe',
        },
        StoredAsSubDirectories: false,
      },
      TableType: 'EXTERNAL_TABLE',
    },
  });
});

test('table.node.defaultChild', () => {
  // GIVEN
  const stack = new cdk.Stack();
  const database = new glue.Database(stack, 'Database');

  // WHEN
  const table = new glue.S3Table(stack, 'Table', {
    database,
    columns: [{
      name: 'col',
      type: glue.Schema.STRING,
    }],
    compressed: true,
    dataFormat: glue.DataFormat.JSON,
  });

  // THEN
  expect(table.node.defaultChild instanceof CfnTable).toEqual(true);
});

describe('parition indexes', () => {
  test('fails with > 3 indexes', () => {
    const stack = new cdk.Stack();
    const database = new glue.Database(stack, 'Database');

    const indexes: glue.PartitionIndex[] = [{
      indexName: 'ind1',
      keyNames: ['part'],
    }, {
      indexName: 'ind2',
      keyNames: ['part'],
    }, {
      indexName: 'ind3',
      keyNames: ['part'],
    }, {
      indexName: 'ind4',
      keyNames: ['part'],
    }];

    expect(() => new glue.S3Table(stack, 'Table', {
      database,
      columns: [{
        name: 'col',
        type: glue.Schema.STRING,
      }],
      partitionKeys: [{
        name: 'part',
        type: glue.Schema.SMALL_INT,
      }],
      partitionIndexes: indexes,
      dataFormat: glue.DataFormat.JSON,
    })).toThrowError('Maximum number of partition indexes allowed is 3');
  });

  test('no indexName', () => {
    const stack = new cdk.Stack();
    const database = new glue.Database(stack, 'Database');

    const indexes: glue.PartitionIndex[] = [{
      keyNames: ['part'],
    }];

    new glue.S3Table(stack, 'Table', {
      database,
      columns: [{
        name: 'col',
        type: glue.Schema.STRING,
      }],
      partitionKeys: [{
        name: 'part',
        type: glue.Schema.SMALL_INT,
      }],
      partitionIndexes: indexes,
      dataFormat: glue.DataFormat.JSON,
    });
  });

  describe('add partition index', () => {
    test('fails if no partition keys', () => {
      const stack = new cdk.Stack();
      const database = new glue.Database(stack, 'Database');

      const table = new glue.S3Table(stack, 'Table', {
        database,
        columns: [{
          name: 'col',
          type: glue.Schema.STRING,
        }],
        dataFormat: glue.DataFormat.JSON,
      });

      expect(() => table.addPartitionIndex({
        indexName: 'my-part',
        keyNames: ['part'],
      })).toThrowError(/The table must have partition keys to create a partition index/);
    });

    test('fails if partition index does not match partition keys', () => {
      const stack = new cdk.Stack();
      const database = new glue.Database(stack, 'Database');

      const table = new glue.S3Table(stack, 'Table', {
        database,
        columns: [{
          name: 'col',
          type: glue.Schema.STRING,
        }],
        partitionKeys: [{
          name: 'part',
          type: glue.Schema.SMALL_INT,
        }],
        dataFormat: glue.DataFormat.JSON,
      });

      expect(() => table.addPartitionIndex({
        indexName: 'my-part',
        keyNames: ['not-part'],
      })).toThrowError(/All index keys must also be partition keys/);
    });

    test('fails with index name < 1 character', () => {
      const stack = new cdk.Stack();
      const database = new glue.Database(stack, 'Database');

      const table = new glue.S3Table(stack, 'Table', {
        database,
        columns: [{
          name: 'col',
          type: glue.Schema.STRING,
        }],
        partitionKeys: [{
          name: 'part',
          type: glue.Schema.SMALL_INT,
        }],
        dataFormat: glue.DataFormat.JSON,
      });

      expect(() => table.addPartitionIndex({
        indexName: '',
        keyNames: ['part'],
      })).toThrowError(/Index name must be between 1 and 255 characters, but got 0/);
    });
  });
});

describe('validate', () => {
  test('at least one column', () => {
    expect(() => {
      createTable({
        columns: [],
      });
    }).toThrowError('you must specify at least one column for the table');
  });

  test('unique column names', () => {
    expect(() => {
      createTable({
        columns: [{
          name: 'col1',
          type: glue.Schema.STRING,
        }, {
          name: 'col1',
          type: glue.Schema.STRING,
        }],
      });
    }).toThrowError("column names and partition keys must be unique, but 'col1' is duplicated");
  });

  test('unique partition keys', () => {
    expect(() => {
      createTable({
        columns: [{
          name: 'col1',
          type: glue.Schema.STRING,
        }],
        partitionKeys: [{
          name: 'p1',
          type: glue.Schema.STRING,
        }, {
          name: 'p1',
          type: glue.Schema.STRING,
        }],
      });
    }).toThrowError("column names and partition keys must be unique, but 'p1' is duplicated");
  });

  test('column names and partition keys are all unique', () => {
    expect(() => {
      createTable({
        columns: [{
          name: 'col1',
          type: glue.Schema.STRING,
        }],
        partitionKeys: [{
          name: 'col1',
          type: glue.Schema.STRING,
        }],
      });
    }).toThrowError("column names and partition keys must be unique, but 'col1' is duplicated");
  });

  test('unique storage descriptor parameters', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'Stack');
    const database = new glue.Database(stack, 'Database');

    expect(() => new glue.S3Table(stack, 'Table', {
      database,
      columns: [{
        name: 'col',
        type: glue.Schema.STRING,
      }],
      dataFormat: glue.DataFormat.JSON,
      storageParameters: [
        glue.StorageParameter.skipHeaderLineCount(2),
        glue.StorageParameter.compressionType(glue.CompressionType.GZIP),
        glue.StorageParameter.custom('foo', 'bar'),
        glue.StorageParameter.custom(glue.StorageParameters.COMPRESSION_TYPE, 'true'),
      ],
    })).toThrowError('Duplicate storage parameter key: compression_type');
  });
});

describe('Table.fromTableArn', () => {
  test('success', () => {
    // GIVEN
    const stack = new cdk.Stack();

    // WHEN
    const table = glue.ExternalTable.fromTableArn(stack, 'boom', 'arn:aws:glue:us-east-1:123456789012:table/db1/tbl1');

    // THEN
    expect(table.tableArn).toEqual('arn:aws:glue:us-east-1:123456789012:table/db1/tbl1');
    expect(table.tableName).toEqual('tbl1');
  });

  test('throws if no ARN is provided', () => {
    // GIVEN
    const stack = new cdk.Stack();

    // THEN
    expect(() => glue.ExternalTable.fromTableArn(stack, 'boom', '')).toThrowError(/ARNs must start with \"arn:\" and have at least 6 components: /);
  });
});

test.each([
  ['enabled', true],
  ['disabled', false],
])('Partition filtering on table %s', (_, enabled) => {
  const app = new cdk.App();
  const dbStack = new cdk.Stack(app, 'db');
  const database = new glue.Database(dbStack, 'Database');

  const tableStack = new cdk.Stack(app, 'table');
  new glue.S3Table(tableStack, 'Table', {
    database,
    columns: [{
      name: 'col',
      type: glue.Schema.STRING,
    }],
    partitionKeys: [{
      name: 'year',
      type: glue.Schema.SMALL_INT,
    }],
    dataFormat: glue.DataFormat.JSON,
    enablePartitionFiltering: enabled,
  });

  Template.fromStack(tableStack).hasResourceProperties('AWS::Glue::Table', {
    CatalogId: {
      Ref: 'AWS::AccountId',
    },
    DatabaseName: {
      'Fn::ImportValue': 'db:ExportsOutputRefDatabaseB269D8BB88F4B1C4',
    },
    TableInput: {
      Name: 'tabletable8fff2c2b',
      Description: 'tabletable8fff2c2b generated by CDK',
      Parameters: {
        'classification': 'json',
        'has_encrypted_data': true,
        'partition_filtering.enabled': enabled,
      },
      PartitionKeys: Match.anyValue(),
      StorageDescriptor: Match.anyValue(),
      TableType: Match.anyValue(),
    },
  });
});

test('Partition filtering on table is not defined (default behavior)', () => {
  const app = new cdk.App();
  const dbStack = new cdk.Stack(app, 'db');
  const database = new glue.Database(dbStack, 'Database');

  const tableStack = new cdk.Stack(app, 'table');
  new glue.S3Table(tableStack, 'Table', {
    database,
    columns: [{
      name: 'col',
      type: glue.Schema.STRING,
    }],
    partitionKeys: [{
      name: 'year',
      type: glue.Schema.SMALL_INT,
    }],
    dataFormat: glue.DataFormat.JSON,
    enablePartitionFiltering: undefined,
  });

  Template.fromStack(tableStack).hasResourceProperties('AWS::Glue::Table', {
    CatalogId: {
      Ref: 'AWS::AccountId',
    },
    DatabaseName: {
      'Fn::ImportValue': 'db:ExportsOutputRefDatabaseB269D8BB88F4B1C4',
    },
    TableInput: {
      Name: 'tabletable8fff2c2b',
      Description: 'tabletable8fff2c2b generated by CDK',
      Parameters: {
        classification: 'json',
        has_encrypted_data: true,
      },
      PartitionKeys: Match.anyValue(),
      StorageDescriptor: Match.anyValue(),
      TableType: Match.anyValue(),
    },
  });
});

test('can specify a physical name', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'Stack');
  const database = new glue.Database(stack, 'Database');
  new glue.S3Table(stack, 'Table', {
    database,
    tableName: 'my_table',
    columns: [{
      name: 'col',
      type: glue.Schema.STRING,
    }],
    dataFormat: glue.DataFormat.JSON,
  });

  Template.fromStack(stack).hasResourceProperties('AWS::Glue::Table', {
    TableInput: {
      Name: 'my_table',
      Description: 'my_table generated by CDK',
    },
  });
});

test('can specify a description', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'Stack');
  const database = new glue.Database(stack, 'Database');
  new glue.S3Table(stack, 'Table', {
    database,
    tableName: 'my_table',
    columns: [{
      name: 'col',
      type: glue.Schema.STRING,
    }],
    description: 'This is a test table.',
    dataFormat: glue.DataFormat.JSON,
  });

  Template.fromStack(stack).hasResourceProperties('AWS::Glue::Table', {
    TableInput: {
      Name: 'my_table',
      Description: 'This is a test table.',
    },
  });
});

test('storage descriptor parameters', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'Stack');
  const database = new glue.Database(stack, 'Database');
  new glue.S3Table(stack, 'Table', {
    database,
    columns: [{
      name: 'col',
      type: glue.Schema.STRING,
    }],
    dataFormat: glue.DataFormat.JSON,
    storageParameters: [
      glue.StorageParameter.skipHeaderLineCount(2),
      glue.StorageParameter.compressionType(glue.CompressionType.GZIP),
      glue.StorageParameter.custom('foo', 'bar'),
      glue.StorageParameter.custom('separatorChar', ','),
    ],
  });

  Template.fromStack(stack).hasResourceProperties('AWS::Glue::Table', {
    TableInput: {
      StorageDescriptor: {
        Parameters: {
          'skip.header.line.count': '2',
          'separatorChar': ',',
          'foo': 'bar',
          'compression_type': 'gzip',
        },
      },
    },
  });
});

test('can specify there are subdirectories', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'Stack');
  const database = new glue.Database(stack, 'Database');
  new glue.S3Table(stack, 'Table', {
    database,
    columns: [{
      name: 'col',
      type: glue.Schema.STRING,
    }],
    dataFormat: glue.DataFormat.JSON,
    storedAsSubDirectories: true,
  });

  Template.fromStack(stack).hasResourceProperties('AWS::Glue::Table', {
    TableInput: {
      StorageDescriptor: {
        StoredAsSubDirectories: true,
      },
    },
  });
});

test('data format without classification string', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'Stack');
  const database = new glue.Database(stack, 'Database');
  const dataFormat = new glue.DataFormat({
    inputFormat: glue.InputFormat.TEXT,
    outputFormat: glue.OutputFormat.HIVE_IGNORE_KEY_TEXT,
    serializationLibrary: glue.SerializationLibrary.OPENX_JSON,
  });
  new glue.S3Table(stack, 'Table', {
    database,
    columns: [{
      name: 'col',
      type: glue.Schema.STRING,
    }],
    dataFormat,
  });

  Template.fromStack(stack).hasResourceProperties('AWS::Glue::Table', {
    TableInput: {
      Parameters: {
        classification: Match.absent(),
      },
      StorageDescriptor: {
        InputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
        OutputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
        SerdeInfo: {
          SerializationLibrary: 'org.openx.data.jsonserde.JsonSerDe',
        },
      },
    },
  });
});

test('can specify table parameter', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'Stack');
  const database = new glue.Database(stack, 'Database');
  const dataFormat = glue.DataFormat.JSON;
  new glue.S3Table(stack, 'Table', {
    database,
    columns: [{
      name: 'col',
      type: glue.Schema.STRING,
    }],
    dataFormat,
    parameters: {
      key1: 'val1',
      key2: 'val2',
    },
  });

  Template.fromStack(stack).hasResourceProperties('AWS::Glue::Table', {
    TableInput: {
      Parameters: {
        key1: 'val1',
        key2: 'val2',
      },
    },
  });
});

function createTable(props: Pick<glue.S3TableProps, Exclude<keyof glue.S3TableProps, 'database' | 'dataFormat'>>): void {
  const stack = new cdk.Stack();
  new glue.S3Table(stack, 'table', {
    ...props,
    database: new glue.Database(stack, 'db'),
    dataFormat: glue.DataFormat.JSON,
  });
}
