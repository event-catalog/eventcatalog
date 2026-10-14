import { describe, expect, it } from 'vitest';
// A model with notes, saved before flows were dropped (it still has them)
import fixture from './fixtures/orders-model-saved-with-flows.json';
import { Model } from '@eventcatalog/visualiser/model';
import { cleanFileName, readDiagramFile, toDiagramFile } from '@eventcatalog/visualiser/studio';

const model = Model.parse(fixture);
const file = (text: string, name = 'orders.eventcatalog') => new File([text], name, { type: 'application/json' });

describe('diagram files', () => {
  it('opens what was saved: the model with its notes, focus and level', async () => {
    const focus = model.resources[0].id;
    const opened = await readDiagramFile(file(toDiagramFile(model, { focus, level: 'services' })));
    expect(opened).toEqual({ model, focus, level: 'services' });
  });

  it('opens files saved before flows were dropped: their flows are left out, the rest as it was', async () => {
    expect(fixture.flows.length).toBeGreaterThan(0);
    const saved = JSON.stringify({ type: 'eventcatalog-diagram', version: 1, model: fixture, level: 'services' });
    const opened = await readDiagramFile(file(saved));
    if ('error' in opened) throw new Error(opened.error);
    expect(opened.model).not.toHaveProperty('flows');
    const { flows: _flows, ...rest } = fixture;
    expect(opened).toEqual({ model: Model.parse(rest), focus: undefined, level: 'services' });
  });

  it('opens a bare model too', async () => {
    expect(await readDiagramFile(file(JSON.stringify(model), 'model.json'))).toEqual({ model, focus: undefined, level: undefined });
  });

  it("says why it can't open a file", async () => {
    expect(await readDiagramFile(file('not json'))).toHaveProperty('error');
    expect(await readDiagramFile(file(JSON.stringify({ type: 'eventcatalog-diagram', version: 1, model: { title: 'x' } })))).toHaveProperty('error');
    expect(await readDiagramFile(file(JSON.stringify({ type: 'eventcatalog-diagram', version: 99, model })))).toHaveProperty('error');
    const broken = { ...model, relations: [...model.relations, { from: 'Nope', to: model.resources[0].id, type: 'sends' }] };
    expect(await readDiagramFile(file(toDiagramFile(broken as Model)))).toHaveProperty('error');
  });

  it('ignores a focus that is not in the diagram', async () => {
    const opened = await readDiagramFile(file(toDiagramFile(model, { focus: 'Nope' })));
    expect(opened).toMatchObject({ focus: undefined });
  });

  it('names files as they typed, safe to save, with the extension once', () => {
    expect(cleanFileName('Orders flow', '.eventcatalog')).toBe('Orders flow.eventcatalog');
    expect(cleanFileName('orders.eventcatalog', '.eventcatalog')).toBe('orders.eventcatalog');
    expect(cleanFileName('../a/b:c?', '.eventcatalog')).toBe('abc.eventcatalog');
    expect(cleanFileName('   ', '.eventcatalog')).toBe('diagram.eventcatalog');
  });
});
