# Security policy

## Supported versions

Security fixes are provided for the latest published version.

## Reporting a vulnerability

Use [GitHub private security advisories](https://github.com/xuhuawork/conversation-navigator/security/advisories/new). Avoid opening a public issue when a report contains exploit details, tokens, private conversation content, or local filesystem information.

Include the plugin version, Codex version, Node.js version, operating system, a minimal reproduction, and sanitized logs. Do not include credentials or complete private conversations.

## Local execution and data handling

- The plugin does not require an API key.
- The Widget has an empty external-domain CSP allowlist and does not initiate third-party network requests.
- The Stop Hook parses its JSON input in memory, checks `last_assistant_message`, and does not read `transcript_path`, write files, or access the network.
- The MCP server runs locally over stdio. Conversation context, suggestion generation, model-context preference updates, and messages sent from the Widget still pass through the Codex host and current model under the user's existing Codex data controls.

Review the exact Stop Hook command in `/hooks` before trusting it. Codex records trust against the Hook definition; updates can require a new review. Disable the Hook immediately if its source or command differs from the installed plugin path.
