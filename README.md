# import-reorder

Re-orders imports in JavaScript and TypeScript files. Usable with ES6-style `import`, as well as Node-style `require`.

## Usage (WIP)

Install:
```
npm install import-reorder
```

Expects paths separated by `\n` if there are multiple, relative to the current working directory.

With staged files:
```
git diff --name-only --cached | reorder
```

The above can be added as a git hook with tools like Husky.

## Important Notes

- Requires use of semicolons.
- Comments associated with imports must be placed **above** the import, NOT to the right of the import on the same line!
