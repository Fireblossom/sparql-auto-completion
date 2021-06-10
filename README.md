# sparql-auto-completion

Forked from https://github.com/Microsoft/vscode-extension-samples/tree/main/lsp-sample

Please use https://marketplace.visualstudio.com/items?itemName=stardog-union.vscode-langserver-sparql for syntax highlighting.

## Functionality

This Language Server works for SPARQL queries. It has the following language features:

- Auto complete prefix
- IntelliSense for terms (`class` or `property`)

![record](https://user-images.githubusercontent.com/16226671/119395733-3ef0f700-bcd4-11eb-8c33-24295774b174.gif)

## Structure

```
.
├── client // Language Client
│   ├── src
│   │   └── extension.ts // Language Client entry point
├── package.json // The extension manifest.
└── server // Language Server
    └── src
        └── server.ts // Language Server entry point
```

## Installation

- Download and install extension https://marketplace.visualstudio.com/items?itemName=Fireblossom.sparql-auto-completion
- Open a document in 'SPAQRL' language mode.
- Enter text content such as `foaf:`. The extension will auto-complete the prefix `PREFIX foaf: <http://xmlns.com/foaf/0.1/>` to the file head.

## Next steps

- [x] auto-import PREFIX (from http://prefix.cc/)
- [x] Entities and properties auto-complete (from https://lov.linkeddata.es/)
- [ ] Validate (SHACL)
