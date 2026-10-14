import { describe, expect, it } from 'vitest';
import { Resource } from '@eventcatalog/visualiser/model';
import { codeLinkOf } from '../view/NodeInfo';

const service = { id: 'orders', type: 'service', name: 'Orders' } as const;

describe("a resource's link to its code", () => {
  it('takes web links', () => {
    for (const url of ['https://github.com/acme/orders/blob/main/src/app.ts#L12', 'http://localhost:3000/docs']) {
      expect(Resource.safeParse({ ...service, url }).success).toBe(true);
    }
  });

  it("refuses links that would run something when they're opened", () => {
    for (const url of ['javascript:alert(document.domain)', 'JavaScript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)']) {
      expect(Resource.safeParse({ ...service, url }).success).toBe(false);
    }
  });

  it("isn't offered for one that got past the schema (e.g. from someone in a live session)", () => {
    expect(codeLinkOf({ ...service, url: 'javascript:alert(1)' } as Resource)).toBeUndefined();
    expect(codeLinkOf({ ...service, url: 'https://github.com/acme/orders' } as Resource)).toBe('https://github.com/acme/orders');
    expect(codeLinkOf({ ...service, evidence: 'Startup.cs:51 (https://github.com/acme/orders/blob/main/Startup.cs#L51)' } as Resource)).toBe(
      'https://github.com/acme/orders/blob/main/Startup.cs#L51'
    );
  });
});
