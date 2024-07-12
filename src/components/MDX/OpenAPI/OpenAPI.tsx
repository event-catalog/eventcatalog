import type { CollectionTypes } from '@types';
import type { CollectionEntry } from 'astro:content';
import * as path from 'path';
import { existsSync } from 'node:fs';
import { buildUrl } from '@utils/url-builder';

const OpenAPI = (props: CollectionEntry<CollectionTypes>) => {
  // @ts-ignore
  const collectionPath = props?.catalog?.path;
  // @ts-ignore
  const publicPath = props?.catalog?.publicPath;
  const fileName = 'openapi.yml';

  const fileExists = existsSync(path.join(process.cwd(), 'public', publicPath, fileName));

  return (
    <div className="mb-4" id="openapi-component">
      <span className="text-3xl font-bold">OpenAPI</span>
      {!fileExists && (
        <div className="text-sm text-red-500">
          OpenAPI file not found. Put your OpenAPI file inside your {collectionPath} directory.
        </div>
      )}
      {fileExists && (
        <div>
          This {props.collection.slice(0, -1)} has an OpenAPI file{' '}
          <a className="text-purple-500" href={buildUrl(`/docs/${props.collection}/${props.data.id}/${props.data.version}/spec`)}>
            you can view here.
          </a>
        </div>
      )}
    </div>
  );
};

export default OpenAPI;
