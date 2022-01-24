const describeSchemas = {
  Content:
    '{"openapi":"3.0.0","info":{"version":"1.0.0","title":"UserCreated"},"paths":{},"components":{"schemas":{"AWSEvent":{"type":"object","required":["detail-type","resources","detail","id","source","time","region","version","account"],"x-amazon-events-detail-type":"userCreated","x-amazon-events-source":"users","properties":{"detail":{"$ref":"#/components/schemas/UserCreated"},"account":{"type":"string"},"detail-type":{"type":"string"},"id":{"type":"string"},"region":{"type":"string"},"resources":{"type":"array","items":{"type":"object"}},"source":{"type":"string"},"time":{"type":"string","format":"date-time"},"version":{"type":"string"}}},"UserCreated":{"type":"object","required":["data"],"properties":{"data":{"$ref":"#/components/schemas/Data"}}},"Data":{"type":"object","required":["id"],"properties":{"id":{"type":"string"}}}}}}',
  LastModified: '2022-01-20T06:58:30.000Z',
  SchemaArn: 'arn:aws:schemas:us-west-1:312708401777:schema/discovered-schemas/users@UserCreated',
  SchemaName: 'users@UserCreated',
  SchemaVersion: '1',
  Tags: {},
  Type: 'OpenApi3',
  VersionCreatedDate: '2022-01-20T06:58:30.000Z',
};

const buildOpenAPIResponse = ({ eventName }) => ({
  Content: `{"openapi":"3.0.0","info":{"version":"1.0.0","title":"${eventName}"},"paths":{},"components":{"schemas":{"AWSEvent":{"type":"object","required":["detail-type","resources","detail","id","source","time","region","version","account"],"x-amazon-events-detail-type":"${eventName}","x-amazon-events-source":"users","properties":{"detail":{"$ref":"#/components/schemas/${eventName}"},"account":{"type":"string"},"detail-type":{"type":"string"},"id":{"type":"string"},"region":{"type":"string"},"resources":{"type":"array","items":{"type":"object"}},"source":{"type":"string"},"time":{"type":"string","format":"date-time"},"version":{"type":"string"}}},"${eventName}":{"type":"object","required":["data"],"properties":{"data":{"$ref":"#/components/schemas/Data"}}},"Data":{"type":"object","required":["id"],"properties":{"id":{"type":"string"}}}}}}`,
  LastModified: '2022-01-20T06:58:30.000Z',
  SchemaArn: `arn:aws:schemas:us-west-1:312708401777:schema/discovered-schemas/users@${eventName}`,
  SchemaName: eventName,
  SchemaVersion: '1',
  Tags: {},
  Type: 'OpenApi3',
  VersionCreatedDate: '2022-01-20T06:58:30.000Z',
});

const exportSchema = {
  Content:
    '{"$schema":"http://json-schema.org/draft-04/schema#","title":"UserCreated","definitions":{"Data":{"properties":{"id":{"type":"string"}},"required":["id"],"type":"object"},"UserCreated":{"properties":{"data":{"$ref":"#/definitions/Data"}},"required":["data"],"type":"object"}},"properties":{"account":{"type":"string"},"detail":{"$ref":"#/definitions/UserCreated"},"detail-type":{"type":"string"},"id":{"type":"string"},"region":{"type":"string"},"resources":{"items":{"type":"object"},"type":"array"},"source":{"type":"string"},"time":{"format":"date-time","type":"string"},"version":{"type":"string"}},"required":["detail-type","resources","detail","id","source","time","region","version","account"],"type":"object","x-amazon-events-detail-type":"userCreated","x-amazon-events-source":"users"}',
  SchemaName: 'users@UserCreated',
  SchemaVersion: '1',
  Type: 'JSONSchemaDraft4',
};

const buildSchema = ({ eventName }) => {
  const namePart = eventName.split('@')[1];
  const detailType = `${namePart.charAt(0).toLowerCase()}${namePart.slice(1, namePart.length)}`;

  return {
    Content: `{"$schema":"http://json-schema.org/draft-04/schema#","title":"${eventName}","definitions":{"Data":{"properties":{"id":{"type":"string"}},"required":["id"],"type":"object"},"${eventName}":{"properties":{"data":{"$ref":"#/definitions/Data"}},"required":["data"],"type":"object"}},"properties":{"account":{"type":"string"},"detail":{"$ref":"#/definitions/${eventName}"},"detail-type":{"type":"string"},"id":{"type":"string"},"region":{"type":"string"},"resources":{"items":{"type":"object"},"type":"array"},"source":{"type":"string"},"time":{"format":"date-time","type":"string"},"version":{"type":"string"}},"required":["detail-type","resources","detail","id","source","time","region","version","account"],"type":"object","x-amazon-events-detail-type":"${detailType}","x-amazon-events-source":"users"}`,
    SchemaName: eventName,
    SchemaVersion: '1',
    Type: 'JSONSchemaDraft4',
  };
};

const listSchemas = {
  Schemas: [
    {
      LastModified: '2022-01-20T06:58:30.000Z',
      SchemaArn: 'arn:aws:schemas:us-west-1:312708401777:schema/discovered-schemas/users@UserCreated',
      SchemaName: 'users@UserCreated',
      Tags: {},
      VersionCount: 1,
    },
    {
      LastModified: '2022-01-20T06:58:30.000Z',
      SchemaArn: 'arn:aws:schemas:us-west-1:312708401777:schema/discovered-schemas/users@UserDeleted',
      SchemaName: 'users@UserDeleted',
      Tags: {},
      VersionCount: 1,
    },
  ],
};

export default {
  describeSchemas,
  exportSchema,
  listSchemas,
  buildSchema,
  buildOpenAPIResponse,
};
