import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import utils from '../index';

const CATALOG_PATH = path.join(__dirname, 'catalog-ubiquitous-language-editurl');

const { writeDomain, addUbiquitousLanguageToDomain, getUbiquitousLanguageFromDomain } = utils(CATALOG_PATH);

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('ubiquitous language editUrl', () => {
  it('preserves collection and term editUrl values on the dictionary', async () => {
    await writeDomain({
      id: 'Payment',
      name: 'Payment Domain',
      version: '0.0.1',
      summary: 'All things to do with the payment systems',
      markdown: '# Hello world',
    });

    await addUbiquitousLanguageToDomain('Payment', {
      editUrl: 'https://github.com/org/catalog/edit/main/domains/Payment/ubiquitous-language.mdx',
      dictionary: [
        {
          id: 'Order',
          name: 'Order',
          summary: 'All things to do with the payment systems',
          description: 'This is a description',
          icon: 'KeyIcon',
          editUrl: 'https://github.com/org/glossary/edit/main/terms/order.md',
        },
      ],
    });

    const ubiquitousLanguage = await getUbiquitousLanguageFromDomain('Payment');

    expect(ubiquitousLanguage).toEqual({
      editUrl: 'https://github.com/org/catalog/edit/main/domains/Payment/ubiquitous-language.mdx',
      dictionary: [
        {
          id: 'Order',
          name: 'Order',
          summary: 'All things to do with the payment systems',
          description: 'This is a description',
          icon: 'KeyIcon',
          editUrl: 'https://github.com/org/glossary/edit/main/terms/order.md',
        },
      ],
    });
  });
});
