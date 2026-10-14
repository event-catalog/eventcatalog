import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { Model, validateModel } from '@eventcatalog/visualiser/model';
import { summarise } from '../../src/model/to-text';
import { canvasToModel, modelToCanvas } from '@eventcatalog/visualiser/studio';
import { addNodes, createHotspot, deleteNodes, readHotspots, updateHotspot } from '@eventcatalog/visualiser/studio';

const model = Model.parse({
  title: 'Hotspots',
  resources: [
    { id: 'orders', type: 'service', name: 'Orders' },
    { id: 'payments', type: 'service', name: 'Payments' },
  ],
  relations: [],
  hotspots: [
    { resource: 'payments', severity: 'critical', title: 'Single point of failure', description: 'One instance, no failover' },
    { resource: 'orders', title: 'No retries on publish' },
  ],
});

describe('hotspots', () => {
  it('default to a warning, with an id, from what the agent sends', () => {
    expect(model.hotspots![1].severity).toBe('warning');
    expect(model.hotspots![1].id).toBeTruthy();
  });

  it('are checked: on a resource that exists', () => {
    const wrong = Model.parse({ ...model, hotspots: [{ resource: 'nope', title: 'Hmm' }] });
    expect(validateModel(wrong).errors.join()).toContain('"nope" isn\'t a resource');
    expect(validateModel(model).errors).toEqual([]);
  });

  it('are summarised for the agent, most important first', () => {
    expect(summarise(model, []).hotspots).toEqual([
      '[critical] Single point of failure (on Payments): One instance, no failover',
      '[warning] No retries on publish (on Orders)',
    ]);
  });

  it('are told to the agent with the open comments', () => {
    const withComments = Model.parse({
      ...model,
      comments: [
        { id: 't1', position: { x: 0, y: 0 }, nodeId: 'orders', author: { name: 'Sam' }, createdAt: 1, messages: [{ id: 'm1', text: 'Is this sync?', author: { name: 'Sam' }, createdAt: 1 }] },
        { id: 't2', position: { x: 0, y: 0 }, author: { name: 'Ann' }, createdAt: 2, resolved: true, messages: [{ id: 'm2', text: 'Done', author: { name: 'Ann' }, createdAt: 2 }] },
      ],
    });
    expect(summarise(withComments, []).openComments).toEqual(['On Orders: Sam: Is this sync?']);
  });

  it('go on the canvas on their nodes, and come back on their resources', async () => {
    const content = await modelToCanvas(model);
    expect(content.hotspots?.map((h) => [h.nodeId, h.severity, h.author.agent])).toEqual([
      ['payments', 'critical', true],
      ['orders', 'warning', true],
    ]);
    const back = canvasToModel(content.nodes, content.edges, { 1: new Map(), 2: new Map() }, model, [], content.hotspots);
    expect(back.hotspots?.map((h) => [h.resource, h.title])).toEqual([
      ['payments', 'Single point of failure'],
      ['orders', 'No retries on publish'],
    ]);
  });

  it('stay where their node was when it is deleted, and can be changed', async () => {
    const content = await modelToCanvas(model);
    const doc = new Y.Doc();
    addNodes(doc, content.nodes, content.edges);
    const id = createHotspot(doc, { severity: 'info', title: 'Key service', nodeId: 'orders', position: { x: 0, y: 0 }, author: { name: 'Sam', color: '#000' } });
    deleteNodes(doc, ['orders']);
    const [kept] = readHotspots(doc);
    expect(kept.nodeId).toBeUndefined();
    expect(kept.position.x).toBeGreaterThan(0);
    updateHotspot(doc, id, { severity: 'critical', title: 'Key service, now critical' });
    expect(readHotspots(doc)[0]).toMatchObject({ severity: 'critical', title: 'Key service, now critical', author: { name: 'Sam' } });
  });
});
