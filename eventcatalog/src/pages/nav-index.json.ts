// src/pages/nav-index.json.ts
import { getCollection } from 'astro:content';

export const prerender = true;

export async function GET() {
  //   const services = await getCollection('services');
  //   const domains = await getCollection('domains');
  //   // ...other collections

  //   const index = buildNavIndex({ services, domains }); // your map logic

  const index = [
    {
      type: 'group',
      title: 'Domains',
      pages: [
        {
          type: 'item',
          title: 'Inventory Domain',
          icon: 'ServerIcon',
        },
      ],
    },
  ];

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
}
