# Third-party notices

The bundled MCP runtime contains the following third-party packages:

| Package | Version | License file |
| --- | ---: | --- |
| `@modelcontextprotocol/ext-apps` | 1.7.5 | [`licenses/ext-apps-LICENSE`](./licenses/ext-apps-LICENSE) |
| `@modelcontextprotocol/sdk` | 1.30.0 | [`licenses/mcp-typescript-sdk-LICENSE`](./licenses/mcp-typescript-sdk-LICENSE) |
| `zod` | 4.4.3 | [`licenses/zod-LICENSE`](./licenses/zod-LICENSE) |

`esbuild` 0.28.1 is used to produce the bundle and is not shipped as runtime code. Its license is preserved at [`licenses/esbuild-LICENSE.md`](./licenses/esbuild-LICENSE.md).

The installable plugin also contains a generated inventory and verbatim license files for every package included in the MCP bundle at `licenses/runtime/DEPENDENCIES.md`.
