// This file exposes the markdown for diagrams in the URL
// For example http://localhost:3000/diagrams/target-architecture/1.0.0 loads the Page
// and http://localhost:3000/diagrams/target-architecture/1.0.0.mdx loads the markdown
// This is used for LLMs to load the markdown for diagrams (llms.txt)

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import fs from 'fs';
import { isLLMSTxtEnabled, isSSR } from '@utils/feature';

const diagrams = await getCollection('diagrams');

export async function getStaticPaths() {
  // Just return empty array if LLMs are not enabled
  if (!isLLMSTxtEnabled()) {
    return [];
  }

  return diagrams.map((diagram) => ({
    params: { id: diagram.data.id, version: diagram.data.version },
    props: { content: diagram },
  }));
}

export const GET: APIRoute = async ({ params, props }) => {
  // Just return empty array if LLMs are not enabled
  if (!isLLMSTxtEnabled()) {
    return new Response('llms.txt is not enabled for this Catalog.', { status: 404 });
  }

  if (isSSR()) {
    // For SSR mode, find the diagram and read its file
    const diagram = diagrams.find((d) => d.data.id === params.id && d.data.version === params.version);
    if (!diagram?.filePath) {
      return new Response('Not found', { status: 404 });
    }
    const file = fs.readFileSync(diagram.filePath, 'utf8');
    return new Response(file, { status: 200 });
  } else {
    if (props?.content?.filePath) {
      const file = fs.readFileSync(props.content.filePath, 'utf8');
      return new Response(file, { status: 200 });
    }
  }

  return new Response('Not found', { status: 404 });
};
