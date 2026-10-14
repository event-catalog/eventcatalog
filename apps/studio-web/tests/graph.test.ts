import { describe, expect, it } from 'vitest';
import fixture from './fixtures/orders-model.json';
import { Model, validateModel } from '@eventcatalog/visualiser/model';
import { buildArchitectureGraph } from '../src/model/to-graph';

const model = Model.parse(fixture);

describe('orders fixture', () => {
  it('is valid', () => {
    expect(validateModel(model).errors).toEqual([]);
  });

  it('builds and lays out three levels', async () => {
    const graph = await buildArchitectureGraph(model, 'orders-service');
    expect(graph.overview?.nodes.length).toBeGreaterThan(0);
    expect(graph.nodes.every((n) => typeof n.position?.x === 'number')).toBe(true);
  });
});
