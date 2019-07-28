const fs = require('fs');

const {
  commentNotation,
  defaultGroup,
  groups,
  importKeywords,
  labelGroups,
  memberBounds
} = require('./config.json');

const cwd = process.cwd();

const commentPattern = new RegExp(commentNotation);
const importPattern = new RegExp(importKeywords);
const memberPattern = new RegExp(memberBounds);

process.stdin.on('data', function(changeList) {
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
  return chunk.split('\n').map((line) => {
    if (line.match(importPattern) === null || line.match(memberPattern) === null) {
      return line;
    }
    
    const breakOnOpeningBrace = line.split('{');
    const prefix = breakOnOpeningBrace[0];
    const breakOnClosingBrace = breakOnOpeningBrace[1].split('}');
    const postfix = breakOnClosingBrace[1];
    const members = breakOnClosingBrace[0].trim().split(', ').sort().join(', ');

    return `${prefix}{ ${members} }${postfix}`;
  }).join('\n');
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

    sortedImports = [ ...sortedImports, ...groupedImports[groupedKey].sort(), '' ];
  });

  if (statements.length > 0) {
    statements.unshift('');
  }

  const processedChunk = sortedImports.join('\n') + statements.join('\n') + code.join('\n');

  return processedChunk;
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
    if (line.match(importPattern) !== null) {
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

    if (line.match(commentPattern) !== null) {
      imports.shift();

      continue;
    }

    if (line.match(importPattern) !== null) {
      let matched = false;

      for (let i = 0; i < groupKeys.length; i++) {
        const groupKey = groupKeys[i];
        const groupKeyPattern = new RegExp(groups[groupKey]);

        if (line.match(groupKeyPattern) !== null) {
          if (!groupedImports[groupKey]) {
            groupedImports[groupKey] = [ line ];
          } else {
            groupedImports[groupKey] = [ ...groupedImports[groupKey], line ];
          }

          matched = true;
    
          break;
        }
      }
    
      if (!matched) {
        if (!groupedImports[defaultGroup]) {
          groupedImports[defaultGroup] = [ line ];
        } else {
          groupedImports[defaultGroup] = [ ...groupedImports[defaultGroup], line ];
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
