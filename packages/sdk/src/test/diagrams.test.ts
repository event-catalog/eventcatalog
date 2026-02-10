// sum.test.js
import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-diagrams');

const { writeDiagram, getDiagram, getDiagrams, rmDiagram, rmDiagramById, versionDiagram, diagramHasVersion, addFileToDiagram } =
  utils(CATALOG_PATH);

// clean the catalog before each test
beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('Diagrams SDK', () => {
  describe('getDiagram', () => {
    it('returns the given diagram id from EventCatalog and the latest version when no version is given,', async () => {
      await writeDiagram({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.1',
        summary: 'System architecture diagram',
        markdown: '# Architecture Diagram',
        attachments: ['https://example.com/diagram.png'],
      });

      const test = await getDiagram('ArchitectureDiagram');

      expect(test).toEqual({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.1',
        summary: 'System architecture diagram',
        markdown: '# Architecture Diagram',
        attachments: ['https://example.com/diagram.png'],
      });
    });

    it('returns the given diagram id from EventCatalog and the requested version when a version is given,', async () => {
      await writeDiagram({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.1',
        summary: 'System architecture diagram',
        markdown: '# Architecture Diagram',
      });

      await versionDiagram('ArchitectureDiagram');

      await writeDiagram({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.2',
        summary: 'System architecture diagram v2',
        markdown: '# Architecture Diagram v2',
      });

      const test = await getDiagram('ArchitectureDiagram', '0.0.1');

      expect(test).toEqual({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.1',
        summary: 'System architecture diagram',
        markdown: '# Architecture Diagram',
      });
    });

    it('returns undefined when a given resource is not found', async () => {
      const diagram = await getDiagram('NonExistentDiagram');
      await expect(diagram).toEqual(undefined);
    });
  });

  describe('getDiagrams', () => {
    it('returns all diagrams from the catalog', async () => {
      await writeDiagram({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.1',
        summary: 'System architecture diagram',
        markdown: '# Architecture Diagram',
      });

      await writeDiagram({
        id: 'DataFlowDiagram',
        name: 'Data Flow Diagram',
        version: '0.0.1',
        summary: 'Data flow diagram',
        markdown: '# Data Flow Diagram',
      });

      const diagrams = await getDiagrams();
      expect(diagrams).toHaveLength(2);
      expect(diagrams.map((d) => d.id).sort()).toEqual(['ArchitectureDiagram', 'DataFlowDiagram']);
    });

    it('returns only latest versions when latestOnly is true', async () => {
      await writeDiagram({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.1',
        summary: 'System architecture diagram',
        markdown: '# Architecture Diagram',
      });

      await versionDiagram('ArchitectureDiagram');

      await writeDiagram({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.2',
        summary: 'System architecture diagram v2',
        markdown: '# Architecture Diagram v2',
      });

      const diagrams = await getDiagrams({ latestOnly: true });
      expect(diagrams).toHaveLength(1);
      expect(diagrams[0].version).toBe('0.0.2');
    });
  });

  describe('writeDiagram', () => {
    it('writes the given diagram to the file system', async () => {
      await writeDiagram({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.1',
        summary: 'System architecture diagram',
        markdown: '# Architecture Diagram',
        owners: ['team-a'],
        badges: [{ content: 'stable', backgroundColor: 'green', textColor: 'white' }],
      });

      const diagram = await getDiagram('ArchitectureDiagram');

      expect(diagram).toEqual({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.1',
        summary: 'System architecture diagram',
        markdown: '# Architecture Diagram',
        owners: ['team-a'],
        badges: [{ content: 'stable', backgroundColor: 'green', textColor: 'white' }],
      });
    });

    it('writes the diagram to a custom path when path is provided', async () => {
      await writeDiagram(
        {
          id: 'ArchitectureDiagram',
          name: 'Architecture Diagram',
          version: '0.0.1',
          summary: 'System architecture diagram',
          markdown: '# Architecture Diagram',
        },
        { path: '/System/ArchitectureDiagram' }
      );

      const diagram = await getDiagram('ArchitectureDiagram');
      expect(diagram).toEqual({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.1',
        summary: 'System architecture diagram',
        markdown: '# Architecture Diagram',
      });
    });
  });

  describe('rmDiagram', () => {
    it('removes a diagram by its path', async () => {
      await writeDiagram({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.1',
        summary: 'System architecture diagram',
        markdown: '# Architecture Diagram',
      });

      await rmDiagram('/ArchitectureDiagram');

      const diagram = await getDiagram('ArchitectureDiagram');

      await expect(diagram).toEqual(undefined);
    });
  });

  describe('rmDiagramById', () => {
    it('removes a diagram by its id', async () => {
      await writeDiagram({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.1',
        summary: 'System architecture diagram',
        markdown: '# Architecture Diagram',
      });

      await rmDiagramById('ArchitectureDiagram');

      const diagram = await getDiagram('ArchitectureDiagram');

      await expect(diagram).toEqual(undefined);
    });

    it('removes a specific version of a diagram by its id and version', async () => {
      await writeDiagram({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.1',
        summary: 'System architecture diagram',
        markdown: '# Architecture Diagram',
      });

      await versionDiagram('ArchitectureDiagram');

      await writeDiagram({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.2',
        summary: 'System architecture diagram v2',
        markdown: '# Architecture Diagram v2',
      });

      await rmDiagramById('ArchitectureDiagram', '0.0.1');

      const oldDiagram = await getDiagram('ArchitectureDiagram', '0.0.1');
      expect(oldDiagram).toEqual(undefined);

      const newDiagram = await getDiagram('ArchitectureDiagram', '0.0.2');
      expect(newDiagram).toEqual({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.2',
        summary: 'System architecture diagram v2',
        markdown: '# Architecture Diagram v2',
      });
    });
  });

  describe('versionDiagram', () => {
    it('versions a diagram by moving it to a versioned directory', async () => {
      await writeDiagram({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.1',
        summary: 'System architecture diagram',
        markdown: '# Architecture Diagram',
      });

      await versionDiagram('ArchitectureDiagram');

      const versionedDiagram = await getDiagram('ArchitectureDiagram', '0.0.1');
      expect(versionedDiagram).toEqual({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.1',
        summary: 'System architecture diagram',
        markdown: '# Architecture Diagram',
      });
    });
  });

  describe('diagramHasVersion', () => {
    it('returns true if diagram version exists', async () => {
      await writeDiagram({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.1',
        summary: 'System architecture diagram',
        markdown: '# Architecture Diagram',
      });

      const hasVersion = await diagramHasVersion('ArchitectureDiagram', '0.0.1');
      expect(hasVersion).toBe(true);
    });

    it('returns false if diagram version does not exist', async () => {
      await writeDiagram({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.1',
        summary: 'System architecture diagram',
        markdown: '# Architecture Diagram',
      });

      const hasVersion = await diagramHasVersion('ArchitectureDiagram', '0.0.2');
      expect(hasVersion).toBe(false);
    });

    it('returns false if diagram does not exist', async () => {
      const hasVersion = await diagramHasVersion('NonExistentDiagram', '0.0.1');
      expect(hasVersion).toBe(false);
    });
  });

  describe('addFileToDiagram', () => {
    it('adds a file to the diagram', async () => {
      await writeDiagram({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.1',
        summary: 'System architecture diagram',
        markdown: '# Architecture Diagram',
      });

      await addFileToDiagram('ArchitectureDiagram', { content: 'test content', fileName: 'diagram.svg' });

      const diagramPath = path.join(CATALOG_PATH, 'diagrams', 'ArchitectureDiagram', 'diagram.svg');
      expect(fs.existsSync(diagramPath)).toBe(true);
      expect(fs.readFileSync(diagramPath, 'utf-8')).toBe('test content');
    });

    it('adds a file to a specific version of the diagram', async () => {
      await writeDiagram({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.1',
        summary: 'System architecture diagram',
        markdown: '# Architecture Diagram',
      });

      await versionDiagram('ArchitectureDiagram');

      await writeDiagram({
        id: 'ArchitectureDiagram',
        name: 'Architecture Diagram',
        version: '0.0.2',
        summary: 'System architecture diagram v2',
        markdown: '# Architecture Diagram v2',
      });

      await addFileToDiagram('ArchitectureDiagram', { content: 'test content v1', fileName: 'diagram.svg' }, '0.0.1');

      const versionedPath = path.join(CATALOG_PATH, 'diagrams', 'ArchitectureDiagram', 'versioned', '0.0.1', 'diagram.svg');
      expect(fs.existsSync(versionedPath)).toBe(true);
      expect(fs.readFileSync(versionedPath, 'utf-8')).toBe('test content v1');
    });
  });
});
