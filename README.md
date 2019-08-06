# import-reorder

Re-orders imports in JavaScript and TypeScript files, **in-place**. Usable with ES6-style `import`, as well as Node-style `require`. Handles multi-line imports, as well as interspersed comments.

## Important Notes

- Requires use of semicolons.
- Comments associated with imports must be placed **above** their associated imports, NOT to the right of their imports on the same line; otherwise, they will be associated with the _next_ statement.

## What

Alphabetizes members.

```javascript
import { fnB , fnC, fnA } from 'some-source';
```

becomes:

```javascript
import { fnA, fnB , fnC } from 'some-source';
```

Alphabetizes imports.

```javascript
import { fnD , fnF, fnE } from 'some-module';
import { fnB , fnC, fnA } from 'some-source';
```

becomes:

```javascript
import { fnA , fnB, fnC } from 'some-source';
import { fnD , fnE, fnF } from 'some-module';
```

Groups related imports.

Example, grouped by `/vendor/` and `/homegrown/`.

```javascript
import { fnD , fnF, fnE } from 'some-vendor-lib';
import { ComponentX } from 'some-homegrown-module';
import { fnB , fnC, fnA } from 'other-vendor-lib';
import { ModuleY } from 'other-homegrown-module';
```

becomes:

```javascript
import { fnA , fnB, fnC } from 'other-vendor-lib';
import { fnD , fnE, fnF } from 'some-vendor-lib';

import { ComponentX } from 'some-homegrown-module';
import { ModuleY } from 'other-homegrown-module';
```

## Usage (WIP)

### Install

```shell
npm install import-reorder
```

### Configure

The CLI looks for a file named `reorder.config.js` in the current working directory. The config should export an object with the following shape (with examples):

```javascript
module.exports = {
  defaultGroup: 'Components',
  fileTypes: /(\.js$|\.jsx$|\.ts$|\.tsx$)/,
  groups: {
    Vendor: /(react|mobx|vendor)/,
    Platform: /platform/,
    Toolkit: /toolkit/,
    'Models/Constants/Types': /(models|constants|types)/,
    Stores: /stores/,
    StdLib: /fs/,
    Config: /config/
  },
  ignoreFiles: /config/,
  importPattern: /(import.*from|const.*require)/,
  indentSpaces: 2,
  maxLineLength: 80,
  membersBegin: /(import \{|const \{)/,
  labelGroups: false
};
```

- `defaultGroup`: Name of the default group, should you want to label it.
- `fileTypes`: The filetypes you want to read; regex of the file extensions.
- `groups`: Defines the groups you want your imports to be in, `groupName: /pattern/`.
- `ignoreFiles`: The files you want to ignore and not modify (for use cases like dynamic imports).
- `indentSpaces`: Size of your indent.
- `maxLineLength`: Length of your lines.
- `labelGroups`: Whether to each group with a comment of the group name (ie: `// StdLib`).

### CLI

The CLI expects paths separated by `\n` if there are multiple, relative to the current working directory.

```shell
echo 'fileA.js\nfileB.js\nAnotherDir/fileC.ts' | reorder
```

With staged files:

```shell
git diff --name-only --cached | reorder
```

The above can be added as a git hook with tools like Husky.

### Module

`import-reorder` exports the CLI as well as the `ReOrderer` class. The class requires as parameters a config object (see above) and the current working directory.

```javascript
const ReOrderer = require('./import-reorder');

const config = require(`${process.cwd()}/reorder.config`);

const reOrderer = new ReOrderer(config, process.cwd());

const sortedText = reOrderer.processText(someBlobOfText);
```

With the class, it's possible to make this tool part of more complex workflows.
