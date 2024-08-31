import type { CollectionTypes } from '@types';
import type { CollectionEntry } from 'astro:content';
import * as path from 'path';
import { existsSync } from 'node:fs';
import { buildUrl } from '@utils/url-builder';

const AsyncAPI = (props: CollectionEntry<CollectionTypes>) => {
  // @ts-ignore
  const collectionPath = props?.catalog?.path;

  // @ts-ignore
  const publicPath = props?.catalog?.publicPath;
  const fileName = 'asyncapi.yaml';
  const fileExists = existsSync(path.join(process.cwd(), 'public', publicPath, fileName));
  
  return (
    <div className="mb-4" id="asyncapi-component">
        <span className="text-3xl font-bold">AsyncApi</span>
        {!fileExists && (
          <div className="text-sm text-red-500">
            AsyncApi file not found. Put your AsyncApi file inside your {collectionPath} directory.
          </div>
        )}
        {fileExists && (
          <div>
          This {props.collection.slice(0, -1)} has an AsyncApi file{' '}
          <a className="text-purple-500" href={buildUrl(`/docs/${props.collection}/${props.data.id}/${props.data.version}/asyncspec`)}>
            you can view here.
          </a>
        </div>
        )}
    </div>
  );
};

export default AsyncAPI;
