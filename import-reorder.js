const fs = require('fs');

const {
  commentNotation,
  defaultGroup,
  groups,
  importPattern,
  labelGroups,
  memberBounds
} = require('./config.json');

const cwd = process.cwd();

const commentPatternRE = new RegExp(commentNotation);
const importPatternRE = new RegExp(importPattern);
const memberPatternRE = new RegExp(memberBounds);

process.stdin.on('data', function (changeList) {
  const filePaths = changeList.toString();

  filePaths.split('\n').forEach((filePath) => {
    const path = `${cwd}/${filePath}`;

    fs.stat(path, (error, stats) => {
      if (error) {
        console.log('SKIPPING ->', error.message);
      }

      if (stats && stats.isFile()) {
        processFile(path);
      }
    });
  });
});

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

  if (part.match(importPatternRE) === null) {
    cb(part);

    return;
  }

  const withAlphabetizedMembers = alphabetizeMembers(part);
  // console.log('--- withAlphabetizedMembers:', withAlphabetizedMembers);
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

  const sortedMembers = imports.map((statement) => {
    if (statement.match(commentPatternRE)) {
      return statement;
    }

    const singleLineStatement = statement.replace(/\n/g, '');

    if (
      singleLineStatement.match(importPatternRE) === null ||
      singleLineStatement.match(memberPatternRE) === null
    ) {
      return singleLineStatement;
    }

    const breakOnOpeningBrace = singleLineStatement.split('{');
    const prefix = breakOnOpeningBrace[0];
    const breakOnClosingBrace = breakOnOpeningBrace[1].split('}');
    const postfix = breakOnClosingBrace[1];
    const members = breakOnClosingBrace[0].trim()
      .split(',')
      .map(member => member.trim())
      .sort()
      .join(', ');

    return `${prefix}{ ${members} }${postfix}`;
  }).join('\n');

  return sortedMembers + code.join('\n');
}

/**
 * alphabetizeImports alphabetizes import statements.
 * 
 * @param {string} chunk Chunk of a file.
 * @returns {string} Processed chunk.
 */
function alphabetizeImports(chunk) {
  const lines = chunk.split('\n');

  const last = findLastImportIndex(lines);

  const code = lines.slice(last + 1);

  const { groupedImports, statements } = groupImportsAndStatements(lines.slice(0, last + 1));

  const groupedKeys = Object.keys(groupedImports);

  let sortedImports = [];

  groupedKeys.forEach(groupedKey => {
    if (labelGroups) {
      sortedImports.push(`// ${groupedKey}`);
    }

    sortedImports = [...sortedImports, ...groupedImports[groupedKey].sort(), ''];
  });

  if (statements.length > 0) {
    statements.unshift('');
  }

  const processedChunk = sortedImports.join('\n') + statements.join('\n') + code.join('\n');

  return processedChunk;
}


function getSections(chunk) {
  const statements = chunk.split(';\n');
  const lastImportIndex = findLastImportIndex(statements);

  return {
    imports: statements.slice(0, lastImportIndex + 1).map(statement => statement + ';'),
    code: statements.slice(lastImportIndex + 1)
      .map(statement => statement !== '' ? statement + ';' : statement)
  };
}

/**
 * findLastImportIndex finds the index of the line of the last import statement.
 * 
 * @param {string[]} lines Chunk of a file split into lines by `\n`.
 * @returns {number} Index of the line of the last import statement.
 */
function findLastImportIndex(lines) {
  let last = 0;

  lines.forEach((line, idx) => {
    if (line.match(importPatternRE) !== null) {
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

    if (line.match(commentPatternRE) !== null) {
      imports.shift();

      continue;
    }

    if (line.match(importPatternRE) !== null) {
      let matched = false;

      for (let i = 0; i < groupKeys.length; i++) {
        const groupKey = groupKeys[i];
        const groupKeyPattern = new RegExp(groups[groupKey]);

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
          groupedImports[defaultGroup] = [...groupedImports[defaultGroup], line];
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
