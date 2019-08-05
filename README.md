# import-reorder

Re-orders imports in JavaScript and TypeScript files. Usable with ES6-style `import`, as well as Node-style `require`.

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
```

With the class, it's possible to make this tool part of more complex workflows.

## Important Notes

- Requires use of semicolons.
- Comments associated with imports must be placed **above** their associated imports, NOT to the right of their imports on the same line!
