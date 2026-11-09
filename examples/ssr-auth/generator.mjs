// `eventcatalog generate` fails when it can't import this file, which is what CI checks: it changes nothing
export default async () => {
  console.log('The catalog generator ran');
};
