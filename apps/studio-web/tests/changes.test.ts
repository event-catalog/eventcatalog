import { describe, expect, it } from 'vitest';
import fixture from './fixtures/orders-model.json';
import { Model } from '@eventcatalog/visualiser/model';
import { applyChanges, Changes } from '../src/model/changes';
import { outlineModel, outlineText } from '../src/model/outline';

const model = Model.parse(fixture);
const service = model.resources.find((resource) => resource.type === 'service' && resource.parent)!;
const container = model.resources.find((resource) => resource.id === service.parent)!;
const event = model.resources.find((resource) => resource.type === 'event')!;

describe('applyChanges', () => {
  it('applies changes in order, each building on the last', () => {
    const { model: next, results } = applyChanges(model, [
      { op: 'add_resource', resource: { id: 'billing', type: 'domain', name: 'Billing' } },
      { op: 'add_resource', resource: { id: 'invoice-service', type: 'service', name: 'Invoice Service', parent: 'billing' } },
      { op: 'add_relation', relation: { from: 'invoice-service', to: event.id, kind: 'receives' } },
      { op: 'set_title', title: 'Orders and billing' },
    ]);
    expect(results.every((result) => result.ok)).toBe(true);
    expect(next.title).toBe('Orders and billing');
    expect(next.resources.find((resource) => resource.id === 'invoice-service')?.parent).toBe('billing');
    expect(next.relations).toHaveLength(model.relations.length + 1);
  });

  it('turns down what would break the model, with the reason, and goes on with the rest', () => {
    const { model: next, results } = applyChanges(model, [
      { op: 'add_resource', resource: { id: service.id, type: 'service', name: 'Again' } },
      { op: 'update_resource', id: service.id, set: { parent: event.id } },
      { op: 'add_relation', relation: { from: 'nowhere', to: event.id, kind: 'sends' } },
      { op: 'remove_resource', id: 'nowhere' },
      { op: 'update_resource', id: service.id, set: { summary: 'Takes orders.' } },
    ]);
    expect(results.map((result) => result.ok)).toEqual([false, false, false, false, true]);
    expect(results[0].error).toContain('already on the diagram');
    expect(results[1].error).toContain('can only sit in');
    expect(results[2].error).toContain("isn't a resource");
    expect(next.resources.find((resource) => resource.id === service.id)?.summary).toBe('Takes orders.');
    expect(next.resources.find((resource) => resource.id === service.id)?.parent).toBe(service.parent);
  });

  it('takes fields off a resource (unset), e.g. its parent, and turns down an update that changes nothing', () => {
    const { model: next, results } = applyChanges(model, [
      { op: 'update_resource', id: service.id, unset: ['parent', 'summary'] },
      { op: 'update_resource', id: service.id },
    ]);
    expect(results.map((result) => result.ok)).toEqual([true, false]);
    const updated = next.resources.find((resource) => resource.id === service.id)!;
    expect(updated.parent).toBeUndefined();
    expect('summary' in updated).toBe(false);
    expect(Changes.safeParse([{ op: 'update_resource', id: service.id, unset: ['id'] }]).success).toBe(false);
  });

  it('removes a container, keeping what was in it, and a resource with its relations', () => {
    const { model: next, results } = applyChanges(model, [
      { op: 'remove_resource', id: container.id },
      { op: 'remove_resource', id: event.id },
    ]);
    expect(results.every((result) => result.ok)).toBe(true);
    expect(next.resources.find((resource) => resource.id === service.id)?.parent).toBeUndefined();
    expect(next.relations.some((relation) => relation.from === event.id || relation.to === event.id)).toBe(false);
  });

  it('is what edit_diagram takes: hotspots get ids, unknown ops are refused', () => {
    const parsed = Changes.parse([{ op: 'add_hotspot', hotspot: { title: 'No retries', resource: service.id } }]);
    expect(parsed[0].op === 'add_hotspot' && parsed[0].hotspot.id).toBeTruthy();
    expect(Changes.safeParse([{ op: 'replace_everything', model }]).success).toBe(false);
    expect(Changes.safeParse([]).success).toBe(false);
  });
});

describe('outlines', () => {
  it('leave out where things are, and cut long schemas short', () => {
    const withLayout = {
      ...model,
      layout: { messages: { [service.id]: { x: 1, y: 2 } } },
      resources: model.resources.map((resource) => (resource.id === event.id ? { ...resource, schema: { format: 'json-schema' as const, content: 'x'.repeat(5000) } } : resource)),
    };
    const outline = outlineModel(withLayout);
    expect('layout' in outline).toBe(false);
    expect(outline.resources.find((resource) => resource.id === event.id)?.schema?.content.length).toBeLessThan(400);
  });

  it('list what is on the diagram, and say how much more there is when cut off', () => {
    const text = outlineText(model);
    expect(text).toContain(`- ${service.id} (service)`);
    expect(text).toContain(`in ${service.parent}`);
    const short = outlineText(model, 100);
    expect(short).toMatch(/…and \d+ more: call read_diagram/);
  });
});
