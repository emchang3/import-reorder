# import-reorder

Re-orders imports in JavaScript and TypeScript files. Requires use of semicolons.

## Usage (WIP)

Expects paths separated by `\n` if there are multiple, relative to the current working directory.

With staged files:
```
git diff --name-only --cached | node import-reorder.js
```

The above can be added as a git hook with tools like Husky.
