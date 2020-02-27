const fs = require('fs');

function ReOrderer(config, cwd) {
  if (!(this instanceof ReOrderer)) {
    return new ReOrderer(config, cwd);
  }

  this.config = config;
  this.cwd = cwd;

  this.alphabetizeImports = alphabetizeImports.bind(this);
  this.alphabetizeMembers = alphabetizeMembers.bind(this);
  this.fileSkip = fileSkip.bind(this);
  this.findLastImportIndex = findLastImportIndex.bind(this);
  this.findLastImportIndex = findLastImportIndex.bind(this);
  this.generateIndent = generateIndent.bind(this);
  this.getSections = getSections.bind(this);
  this.groupImportsAndStatements = groupImportsAndStatements.bind(this);
  this.handleChangelist = handleChangelist.bind(this);
  this.processChunk = processChunk.bind(this);
  this.processFile = processFile.bind(this);
  this.processText = processText.bind(this);

  return this;
}

function fileSkip(message) {
  console.log('SKIPPING ->', message);
}

/**
 * handleChangelist handles a list of files, positioned relatively to the current working directory.
 *
 * @param {string} changeList A list of files.
 */
async function handleChangelist(changeList) {
  const { fileTypes, ignoreFiles } = this.config;

  const filePaths = changeList.toString().trim();

  const fhPromises = filePaths.split('\n').map(filePath => {
    return new Promise(resolve => {
      if (
        filePath.match(fileTypes) === null ||
        filePath.match(ignoreFiles) !== null
      ) {
        resolve(this.fileSkip(filePath));

        return;
      }

      const path = `${this.cwd}/${filePath}`;

      fs.stat(path, (error, stats) => {
        if (error) {
          resolve(this.fileSkip(error.message));

          return;
        }

        if (stats && stats.isFile()) {
          resolve(this.processFile(path));
        }
      });
    });
  });

  await Promise.all(fhPromises);
}

/**
 * processFile alphabetizes imports and members of imports for a file.
 *
 * @param {string} filePath Path to file.
 */
function processFile(filePath) {
  const parts = [];

  const rs = fs.createReadStream(filePath);

  rs.on('error', error => console.log(error));

  rs.on('data', chunk => this.processChunk(chunk, part => parts.push(part)));

  rs.on('end', () => {
    const ws = fs.createWriteStream(filePath);

    ws.on('error', error => console.log(error));

    ws.on('finish', () => ws.end());

    ws.write(parts.join(''));
  });
}

/**
 * processText provides a programmatic entrypoint to the functionality of the class.
 * 
 * @param {string} chunk A blob of text. Ostensibly has import statements.
 * @returns {string} A blob of text with sorted import statements.
 */
function processText(chunk) {
  const parts = [];

  this.processChunk(chunk, part => parts.push(part));

  return parts.join('');
}

/**
 * processChunk processes a chunk of a file during streaming.
 *
 * @param {string} chunk Chunk of a file.
 * @param {(part: string) => void} cb Callback that pushes a part to the whole.
 * @returns {string} Processed chunk.
 */
function processChunk(chunk, cb) {
  const part = chunk.toString();

  if (part.match(this.config.importPattern) === null) {
    cb(part);

    return;
  }

  const withAlphabetizedMembers = this.alphabetizeMembers(part);
  const withAlphabetizedImports = this.alphabetizeImports(
    withAlphabetizedMembers
  );

  cb(withAlphabetizedImports);
}

/**
 * alphabetizeMembers alphabetizes members of imports.
 *
 * @param {string} chunk Chunk of a file.
 * @returns {string} Processed chunk.
 */
function alphabetizeMembers(chunk) {
  const {
    importPattern,
    maxLineLength,
    membersBegin
  } = this.config;

  const { imports, code } = this.getSections(chunk);

  const sortedMembers = imports
    .map(statement => {
      const singleLineStatement = statement.replace(/\n/g, '');

      if (
        singleLineStatement.match(importPattern) === null ||
        singleLineStatement.match(membersBegin) === null
      ) {
        return statement;
      }

      const tooLong =
        maxLineLength && singleLineStatement.length > maxLineLength;
      const indent = this.generateIndent();

      // Assumes import members are within first set of braces.
      const breakOnOpeningBrace = statement.split('{');
      let prefix = breakOnOpeningBrace[0];
      prefix += tooLong ? '{\n' : '{ ';
      const breakOnClosingBrace = breakOnOpeningBrace
        .slice(1)
        .join('{')
        .split('}');
      let postfix = breakOnClosingBrace.slice(1).join('}');
      postfix = tooLong ? '\n}' + postfix : ' }' + postfix;
      let members = breakOnClosingBrace[0]
        .trim()
        .split(',')
        .map(member => member.trim())
        .sort((a, b) => sortAlphabetically(this.config, a, b))
        .map(member => (tooLong ? indent + member : member))
        .join(tooLong ? ',\n' : ', ');

      return `${prefix}${members}${postfix}`;
    })
    .join('\n')
    .trim();

  const joinedCode = code.length > 0 ? `\n${code.trimLeft()}` : '';

  return sortedMembers + joinedCode;
}

function sortAlphabetically(config, a, b) {
  if (config.caseSensitive) {
    return a.localeCompare(b);
  }

  return a.toLowerCase().localeCompare(b.toLowerCase());
}

/**
 * generateIndent generates an indent composed of spaces.
 *
 * @returns {string} A string with number of spaces specified by config; defaults to 2.
 */
function generateIndent() {
  const spaces = this.config.indentSpaces || 2;

  let indent = '';
  for (let i = 0; i < spaces; i++) {
    indent += ' ';
  }

  return indent;
}

/**
 * alphabetizeImports alphabetizes import statements.
 *
 * @param {string} chunk Chunk of a file.
 * @returns {string} Processed chunk.
 */
function alphabetizeImports(chunk) {
  const { imports, code } = this.getSections(chunk);
  const { groupedImports, statements } = this.groupImportsAndStatements(
    imports
  );

  const groupKeys = Reflect.ownKeys(this.config.groups);

  let sortedImports = [];

  groupKeys.forEach(groupKey => {
    if (groupedImports[groupKey]) {
      sortedImports = [
        ...sortedImports,
        ...groupedImports[groupKey].sort((a, b) => sortAlphabetically(this.config, a, b)),
        ''
      ];
    }
  });

  const defaultGroup = this.config.defaultGroup;

  if (groupedImports[defaultGroup]) {
    sortedImports = [
      ...sortedImports,
      ...groupedImports[defaultGroup].sort((a, b) => sortAlphabetically(this.config, a, b)),
      ''
    ];
  }

  const joinedImports = sortedImports.join('\n').trim();
  const joinedStatements =
    statements.length > 0 ? `\n\n${statements.join('\n')}` : '';
  const joinedCode = code.length > 0 ? `\n\n${code}` : '';

  const processedChunk = `${joinedImports}${joinedStatements}${joinedCode}`;

  return processedChunk;
}

/**
 * getSections returns sections of a file split into imports and code.
 *
 * @param {string} chunk Chunk of a file.
 * @returns { imports: string[], code: string } Imports as a list split by `;\n`, code as a string.
 */
function getSections(chunk) {
  const statements = chunk.split(';\n');
  const lastImportIndex = this.findLastImportIndex(statements);

  return {
    imports: statements
      .slice(0, lastImportIndex + 1)
      .map(statement => statement.trim() + ';'),
    code: statements.slice(lastImportIndex + 1).join(';\n')
  };
}

/**
 * findLastImportIndex finds the index of the line of the last import statement.
 *
 * @param {string[]} lines Chunk of a file split into lines by `;\n`.
 * @returns {number} Index of the line of the last import statement.
 */
function findLastImportIndex(lines) {
  let last = 0;

  lines.forEach((line, idx) => {
    if (
      line
        .split('\n')
        .join('')
        .match(this.config.importPattern) !== null
    ) {
      last = idx;
    }
  });

  return last;
}

/**
 * groupImportsAndStatements separates imports and statements into groups.
 *
 * @param {string[]} imports Lines of code in the import area. Not all may be imports.
 * @returns {{
 *  groupedImports: { [group: string]: string[] },
 *  statements: string[]
 * }} Grouped imports and statements.
 */
function groupImportsAndStatements(imports) {
  const { defaultGroup, groups, importPattern } = this.config;

  const groupKeys = Object.keys(groups);

  const groupedImports = {};
  const statements = [];

  while (imports.length > 0) {
    const line = imports[0];

    if (
      line
        .split('\n')
        .join('')
        .match(importPattern) !== null
    ) {
      let matched = false;

      for (let i = 0; i < groupKeys.length; i++) {
        const groupKey = groupKeys[i];
        const groupKeyPattern = groups[groupKey];

        if (line.match(groupKeyPattern) !== null) {
          if (!groupedImports[groupKey]) {
            groupedImports[groupKey] = [line];
          } else {
            groupedImports[groupKey] = [...groupedImports[groupKey], line];
          }

          matched = true;

          break;
        }
      }

      if (!matched) {
        if (!groupedImports[defaultGroup]) {
          groupedImports[defaultGroup] = [line];
        } else {
          groupedImports[defaultGroup] = [
            ...groupedImports[defaultGroup],
            line
          ];
        }
      }

      imports.shift();

      continue;
    }

    statements.push(line);

    imports.shift();
  }

  return { groupedImports, statements };
}

module.exports = ReOrderer;
