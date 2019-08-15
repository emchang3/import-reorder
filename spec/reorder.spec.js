const ReOrderer = require('../import-reorder');

const config = require('../reorder.config');

const chunk = `
import * as React from 'react';

/**
 * Some comments
 * in the middle
 */

const someCode = 'in the middle';
import { someFn } from 'some-module';
// Another comment.
const {
  otherMember,
  member,
  anotherMember,
  forLength
} = require('why-is-this-a-require');
someCode.split(' ');
`;

const statementList = [
  `import * as React from 'react';`,
  `
    /**
     * Some comments
     * in the middle
     */
  `,
  `const someCode = 'in the middle';`,
  `// Another comment.`,
  `const {
    otherMember,
    member
  } = require('why-is-this-a-require');`,
  `someCode.split(' ');`
];

describe('a suite of tests for import-reorder', () => {
  let reOrderer;

  beforeEach(() => {
    reOrderer = new ReOrderer(config, process.cwd());
  });

  describe('a suite of tests for the constructor', () => {
    it('should properly construct the class', () => {
      expect(reOrderer.config).toEqual(config);

      expect(typeof reOrderer.alphabetizeImports).toEqual('function');
      expect(typeof reOrderer.alphabetizeMembers).toEqual('function');
      expect(typeof reOrderer.fileSkip).toEqual('function');
      expect(typeof reOrderer.findLastImportIndex).toEqual('function');
      expect(typeof reOrderer.findLastImportIndex).toEqual('function');
      expect(typeof reOrderer.generateIndent).toEqual('function');
      expect(typeof reOrderer.getSections).toEqual('function');
      expect(typeof reOrderer.groupImportsAndStatements).toEqual('function');
      expect(typeof reOrderer.handleChangelist).toEqual('function');
      expect(typeof reOrderer.processChunk).toEqual('function');
      expect(typeof reOrderer.processFile).toEqual('function');
      expect(typeof reOrderer.processText).toEqual('function');
    });

    it('catches the mistake of not using `new`', () => {
      const ro = ReOrderer(config, process.cwd());

      expect(ro.config).toEqual(config);
    });
  });

  describe('a suite of tests for #generateIndent', () => {
    it('should adhere to config when it is present', () => {
      reOrderer.config.indentSpaces = 4;

      expect(reOrderer.generateIndent()).toEqual('    ');
    });

    it('should adhere to default to 2 when config is absent', () => {
      reOrderer.config.indentSpaces = undefined;

      expect(reOrderer.generateIndent()).toEqual('  ');
    });
  });

  describe('a suite of tests for #fileSkip', () => {
    it('should call console.log with the message', () => {
      global.console = { log: jest.fn() };

      reOrderer.fileSkip('any old message');

      expect(global.console.log).toHaveBeenCalledTimes(1);
      expect(global.console.log).toHaveBeenCalledWith(
        'SKIPPING ->',
        'any old message'
      );
    });
  });

  describe('a suite of tests for #handleChangelist', () => {
    it('should properly handle existing files', async () => {
      reOrderer.processFile = jest.fn();

      await reOrderer.handleChangelist(
        'spec/fixtures/testFile.js\nspec/fixtures/testFile2.js'
      );

      expect(reOrderer.processFile).toHaveBeenCalledTimes(2);
    });

    it('should properly handle missing files', async () => {
      reOrderer.processFile = jest.fn();
      reOrderer.fileSkip = jest.fn();

      await reOrderer.handleChangelist('spec/fixtures/missing.js');

      expect(reOrderer.processFile).toHaveBeenCalledTimes(0);
      expect(reOrderer.fileSkip).toHaveBeenCalledTimes(1);
    });

    it('should properly handle invalid files', async () => {
      reOrderer.processFile = jest.fn();
      reOrderer.fileSkip = jest.fn();

      await reOrderer.handleChangelist('spec/fixtures/invalid.rb');

      expect(reOrderer.processFile).toHaveBeenCalledTimes(0);
      expect(reOrderer.fileSkip).toHaveBeenCalledTimes(1);
    });
  });

  describe('a suite of tests for #findLastImportIndex', () => {
    it('should properly find the last import statement', () => {
      expect(reOrderer.findLastImportIndex(statementList)).toEqual(4);
    });
  });

  describe('a suite of tests for #getSections', () => {
    it('should correctly split out the import section from the rest', () => {
      const importSection = reOrderer.getSections(chunk);

      expect(importSection.imports).toEqual([
        `import * as React from 'react';`,
        `/**\n * Some comments\n * in the middle\n */\n\nconst someCode = 'in the middle';`,
        `import { someFn } from 'some-module';`,
        `// Another comment.\nconst {\n  otherMember,\n  member,\n  anotherMember,\n  forLength\n} = require('why-is-this-a-require');`
      ]);
      expect(importSection.code).toEqual(`someCode.split(' ');\n`);
    });
  });

  describe('a suite of test for #groupImportsAndStatements', () => {
    it('should correctly split out statements and group imports', () => {
      const importSection = reOrderer.groupImportsAndStatements([
        `import * as React from 'react';`,
        `import { thing } from 'some-vendor-lib';`,
        `/**\n * Some comments\n * in the middle\n */\n\nconst someCode = 'in the middle';`,
        `// Another comment.\nconst {\n  otherMember,\n  member\n} = require('some-platform-lib');`,
        `import { random } from 'some-local-module';`,
        `import { another } from 'random-module';`
      ]);

      expect(importSection.groupedImports).toEqual({
        Vendor: [`import * as React from 'react';`, `import { thing } from 'some-vendor-lib';`],
        Platform: [`// Another comment.\nconst {\n  otherMember,\n  member\n} = require('some-platform-lib');`],
        Components: [`import { random } from 'some-local-module';`, `import { another } from 'random-module';`]
      });
      expect(importSection.statements).toEqual([`/**\n * Some comments\n * in the middle\n */\n\nconst someCode = 'in the middle';`]);
    });
  });

  describe('a suite of tests for #processChunk', () => {
    it('should handle a chunk with imports', () => {
      reOrderer.alphabetizeMembers = jest.fn();
      reOrderer.alphabetizeImports = jest.fn();
      const proccessChunkCb = jest.fn();

      reOrderer.processChunk(
        `import * as something from 'other';`,
        proccessChunkCb
      );

      expect(reOrderer.alphabetizeMembers).toHaveBeenCalledTimes(1);
      expect(reOrderer.alphabetizeImports).toHaveBeenCalledTimes(1);
      expect(proccessChunkCb).toHaveBeenCalledTimes(1);
    });

    it('should handle a chunk with no imports', () => {
      reOrderer.alphabetizeMembers = jest.fn();
      reOrderer.alphabetizeImports = jest.fn();
      const proccessChunkCb = jest.fn();

      reOrderer.processChunk(
        `const hasCode = 'but no imports';`,
        proccessChunkCb
      );

      expect(reOrderer.alphabetizeMembers).toHaveBeenCalledTimes(0);
      expect(reOrderer.alphabetizeImports).toHaveBeenCalledTimes(0);
      expect(proccessChunkCb).toHaveBeenCalledTimes(1);
    });

    it('should properly alphabetize imports and members of imports', () => {
      const parts = [];

      reOrderer.processChunk(chunk, part => parts.push(part));

      const joined = parts.join('');

      expect(joined).toMatchSnapshot();

      const result = reOrderer.processText(chunk);

      expect(result).toEqual(joined);
    });
  });
});
