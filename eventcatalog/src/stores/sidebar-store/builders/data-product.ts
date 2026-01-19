import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import type { NavNode, ChildRef } from './shared';
import { buildQuickReferenceSection, buildOwnersSection, shouldRenderSideBarSection } from './shared';
import { isVisualiserEnabled } from '@utils/feature';
import { pluralizeMessageType } from '@utils/collections/messages';

export const buildDataProductNode = (dataProduct: CollectionEntry<'data-products'>, owners: any[]): NavNode => {
  const inputMessages = dataProduct.data.inputs || [];
  const outputMessages = dataProduct.data.outputs || [];

  const renderVisualiser = isVisualiserEnabled();
  const renderOwners = owners.length > 0 && shouldRenderSideBarSection(dataProduct, 'owners');

  return {
    type: 'item',
    title: dataProduct.data.name,
    badge: 'Data Product',
    summary: dataProduct.data.summary,
    pages: [
      buildQuickReferenceSection([
        { title: 'Overview', href: buildUrl(`/docs/data-products/${dataProduct.data.id}/${dataProduct.data.version}`) },
      ]),
      renderVisualiser && {
        type: 'group',
        title: 'Architecture',
        icon: 'Workflow',
        pages: [
          {
            type: 'item',
            title: 'Map',
            href: buildUrl(`/visualiser/data-products/${dataProduct.data.id}/${dataProduct.data.version}`),
          },
        ],
      },
      inputMessages.length > 0 && {
        type: 'group',
        title: 'Inputs',
        icon: 'ArrowDownToLine',
        pages: inputMessages.map(
          (message) =>
            `${pluralizeMessageType(message as any)}:${(message as any).data?.id || (message as any).id}:${(message as any).data?.version || (message as any).version || 'latest'}`
        ),
      },
      outputMessages.length > 0 && {
        type: 'group',
        title: 'Outputs',
        icon: 'ArrowUpFromLine',
        pages: outputMessages.map(
          (output) =>
            `${pluralizeMessageType(output as any)}:${(output as any).data?.id || (output as any).id}:${(output as any).data?.version || (output as any).version || 'latest'}`
        ),
      },
      renderOwners && buildOwnersSection(owners),
    ].filter(Boolean) as ChildRef[],
  };
};
