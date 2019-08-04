const fs = require('fs');

const {
  commentBegin,
  defaultGroup,
  fileTypes,
  groups,
  ignoreFiles,
  importPattern,
  indentSpaces,
  labelGroups,
  maxLineLength,
  membersBegin
} = require(`${process.cwd()}/reorder.config.js`);

process.stdin.on('data', handleChangelist);

/**
 * handleChangelist handles a list of files, positioned relatively to the current working directory.
 * 
 * @param {string} changeList A list of files.
 */
function handleChangelist(changeList) {
  const filePaths = changeList.toString();

  filePaths.split('\n').forEach(filePath => {
    if (filePath.match(fileTypes) === null || filePath.match(ignoreFiles) !== null) {
      return;
    }

    const path = `${process.cwd()}/${filePath}`;

    fs.stat(path, (error, stats) => {
      if (error) {
        console.log('SKIPPING ->', error.message);
      }

      if (stats && stats.isFile()) {
        processFile(path);
      }
    });
  });
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

  rs.on('data', chunk => processChunk(chunk, part => parts.push(part)));

  rs.on('end', () => {
    const ws = fs.createWriteStream(filePath);

    ws.on('error', error => console.log(error));

    ws.on('finish', () => ws.end());

    ws.write(parts.join(''));
  });
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

  if (part.match(importPattern) === null) {
    cb(part);

    return;
  }

  const withAlphabetizedMembers = alphabetizeMembers(part);
  const withAlphabetizedImports = alphabetizeImports(withAlphabetizedMembers);

  cb(withAlphabetizedImports);
}

/**
 * alphabetizeMembers alphabetizes members of imports.
 *
 * @param {string} chunk Chunk of a file.
 * @returns {string} Processed chunk.
 */
function alphabetizeMembers(chunk) {
  const { imports, code } = getSections(chunk);

  const sortedMembers = imports
    .map(statement => {
      if (statement.match(commentBegin)) {
        return statement;
      }

      const singleLineStatement = statement.replace(/\n/g, '');

      if (
        singleLineStatement.match(importPattern) === null ||
        singleLineStatement.match(membersBegin) === null
      ) {
        return statement;
      }

      const tooLong =
        maxLineLength && singleLineStatement.length > maxLineLength;
      const indent = generateIndent();

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
        .sort()
        .map(member => tooLong ? indent + member : member)
        .join(tooLong ? ',\n' : ', ');

      return `${prefix}${members}${postfix}`;
    })
    .join('\n')
    .trim();

  return sortedMembers + code;
}

function generateIndent() {
  const spaces = indentSpaces || 2;

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
  const { imports, code } = getSections(chunk);
  const { groupedImports, statements } = groupImportsAndStatements(imports);

  const groupedKeys = Object.keys(groupedImports);

  let sortedImports = [];

  groupedKeys.forEach(groupedKey => {
    if (labelGroups) {
      sortedImports.push(`// ${groupedKey}`);
    }

    sortedImports = [
      ...sortedImports,
      ...groupedImports[groupedKey].sort(),
      ''
    ];
  });

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
  const lastImportIndex = findLastImportIndex(statements);

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
        .match(importPattern) !== null
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
 * @returns {{ groupedImports: { [group: string]: string[] }, statements: string[] }} Grouped imports and statements.
 */
function groupImportsAndStatements(imports) {
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
