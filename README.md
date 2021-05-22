# sparql-auto-completion

Forked from https://github.com/Microsoft/vscode-extension-samples/tree/main/lsp-sample

## Functionality

This Language Server works for SPARQL queries. It has the following language features:

- Completions prefix
- Diagnostics regenerated on each file change or configuration change

It also includes an End-to-End test.

## Structure

```
.
├── client // Language Client
│   ├── src
│   │   ├── test // End to End tests for Language Client / Server
│   │   └── extension.ts // Language Client entry point
├── package.json // The extension manifest.
└── server // Language Server
    └── src
        └── server.ts // Language Server entry point
```

## Running the Sample

- Run `npm install` in this folder. This installs all necessary npm modules in both the client and server folder
- Open VS Code on this folder.
- Press Ctrl+Shift+B to compile the client and server.
- Switch to the Debug viewlet.
- Select `Launch Client` from the drop down.
- Run the launch config.
- If you want to debug the server as well use the launch configuration `Attach to Server`
- In the [Extension Development Host] instance of VSCode, open a document in 'plain text' language mode.
  - Enter text content such as `foaf:`. The extension will auto-compelte the prefix `PREFIX foaf: <http://xmlns.com/foaf/0.1/>` to the file head.

## Next step

- [x] auto-import PREFIX (from http://prefix.cc/)
- [ ] Entities and properties validation