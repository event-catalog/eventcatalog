import { describe, expect, it } from 'vitest';
import fixture from './fixtures/orders-model.json';
import fixtureV2 from './fixtures/orders-model-v2.json';
import { Model } from '@eventcatalog/visualiser/model';
import { buildArchitectureGraph } from '../src/model/to-graph';
import { toCatalogPrompt } from '../src/model/to-prompt';
import { resourceForNode } from '../view/focus';
import { playDiagram, toStage, type StageState } from '../view/build/choreography';

const model = Model.parse(fixture);

describe('focus', () => {
  it('finds the resource behind group and card nodes', () => {
    expect(resourceForNode('domain-group-sales', model)?.id).toBe('sales');
    expect(resourceForNode('system-ordering', model)?.id).toBe('ordering');
    expect(resourceForNode('OrderPlaced', model)?.id).toBe('OrderPlaced');
  });
});

describe('document prompt', () => {
  it('points at the skills and carries the whole model', () => {
    const prompt = toCatalogPrompt(model);
    expect(prompt).toContain('npx skills add event-catalog/skills');
    expect(prompt).toContain('catalog-documentation-creator');
    expect(JSON.parse(prompt.split('```json\n')[1].split('\n```')[0]).resources).toHaveLength(model.resources.length);
  });
});

describe('choreography', () => {
  // Plays instantly (cancelled), and always ends on the target diagram
  const play = async (from: StageState | undefined, to: StageState) => {
    let shown: StageState | undefined;
    await playDiagram({ get: () => shown!, set: (state) => (shown = state), present: () => {}, cancelled: () => true }, from, to);
    return shown!;
  };

  it('ends on the new diagram, from nothing or from the last one', async () => {
    const v1 = toStage(await buildArchitectureGraph(model));
    const v2 = toStage(await buildArchitectureGraph(Model.parse(fixtureV2)));
    expect([...(await play(undefined, v1)).nodes.keys()].sort()).toEqual([...v1.nodes.keys()].sort());
    const changed = await play(v1, v2);
    expect([...changed.nodes.keys()].sort()).toEqual([...v2.nodes.keys()].sort());
    expect(changed.nodes.get('billing-service')?.parentId).toBe('system-group-payments');
  });
});

describe('tours', () => {
  it('reject scenes pointing at resources that are not in the diagram', async () => {
    const { validateTour } = await import('@eventcatalog/visualiser/model');
    expect(validateTour(model, [{ focus: ['orders-service'], notes: [{ resource: 'orders-service', text: 'Hi' }] }])).toEqual([]);
    expect(validateTour(model, [{ focus: ['nope'] }, { code: [{ resource: 'missing', code: '{}' }] }])).toHaveLength(2);
  });

  it('travel in view links with the diagram', async () => {
    const { viewLink, parseViewFragment } = await import('../src/lib/encode');
    const tour = [{ caption: 'Start here', focus: ['orders-service'] }];
    const parsed = parseViewFragment(viewLink('https://mcp.eventcatalog.dev', model, { tour })!);
    expect(parsed.model?.title).toBe(model.title);
    expect(parsed.tour).toEqual(tour);
  });
});
