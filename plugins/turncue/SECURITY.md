# Security policy

## Supported versions

Security fixes are provided for the latest published version.

## Reporting a vulnerability

Use [GitHub private security advisories](https://github.com/xuhuawork/turncue/security/advisories/new). Avoid opening a public issue when a report contains exploit details, tokens, private conversation content, or local filesystem information.

Include the plugin version, Codex version, Node.js version, operating system, a minimal reproduction, and sanitized logs. Do not include credentials or complete private conversations.

## Local execution and data handling

- The plugin does not require an API key.
- The Widget has an empty external-domain CSP allowlist and does not initiate third-party network requests.
- Safe mode does not register a blocking `Stop` Hook or inject a continuation prompt into a task.
- The optional `SessionStart` observer watches lifecycle events only. It does not write back to the task, invoke `turn/start` or `thread/inject_items`, or request `show_next_steps`.
- The MCP server runs locally over stdio. Conversation context, suggestion generation, model-context preference updates, and messages sent from the Widget still pass through the Codex host and current model under the user's existing Codex data controls.

Review the exact `SessionStart` observer command in `/hooks` before trusting it. Codex records trust against the Hook definition, so updates can require a new review. Disable the observer immediately if its source or command differs from the installed plugin path.

If `/hooks` still shows an enabled TurnCue `Stop` Hook that points to `auto-navigation-stop-hook.mjs`, disable it and reinstall the current plugin. That definition belongs to the legacy automatic-continuation design and can interrupt or extend an active task.

Users migrating from the previous `conversation-navigator` technical ID should remove that installation before adding `turncue@turncue`. Disable any Hook that still points to the old installation path so only one TurnCue MCP server and Hook set can load.

Standard Codex Desktop currently exposes no public endpoint that lets a plugin observer attach to the same App Server instance used by the desktop app. The observer therefore makes no per-turn automatic-card guarantee.
