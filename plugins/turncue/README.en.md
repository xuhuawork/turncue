# TurnCue

[中文](./README.md) | [English](./README.en.md)

TurnCue is a local conversation-navigation plugin for the Codex desktop app. It provides an MCP Widget with 3–5 editable directions when requested by the model or by a manual “Show next steps” command.

The public product name is **TurnCue**. The plugin, Marketplace, and MCP technical IDs are unified as `turncue`.

![TurnCue English interface showing three next-step suggestions after a completed response](./docs/images/turncue-widget-en.jpg)

## Features

- Shows the suggestion card through model-driven or manual invocation.
- Supports Auto, Chinese, and English language modes.
- Includes Brainstorm, Rational, and Empathic navigation personalities.
- Generates 3, 4, or 5 suggestions per turn.
- Gives every suggestion a current objective, a concrete action, and a verifiable deliverable.
- Opens an editable draft on single click and sends it back to the current task.
- Runs the MCP server, Widget, and optional SessionStart observer locally, with no public endpoint, OAuth, OpenAI API key, or additional database.
- Uses no `Stop` block in safe mode. The observer watches lifecycle events only; it does not write back to the task or start a model continuation.

## Language and personality

The preference menu in the Widget offers three language modes:

- **Auto**: follows the language of the latest substantive user request, then falls back to the Codex host locale when the language is unclear.
- **中文**: keeps subsequent suggestions in Chinese.
- **English**: keeps subsequent suggestions in English.

Changing the language updates fixed Widget labels immediately and affects newly generated suggestions from the next turn onward. Existing suggestions are not translated automatically.

The three personalities keep stable technical IDs across both languages:

- **Brainstorm / 创意脑暴** (`brainstorm`): favors divergence, unexpected connections, and clearly distinct creative paths.
- **Rational / 理性推演** (`rational`): favors evidence, constraints, risks, priorities, and verification.
- **Empathic / 感性共鸣** (`empathic`): favors audience response, emotion, narrative tone, and aesthetic experience.

## Safe mode and execution order

```text
Model decision or manual request → turncue/show_next_steps → Widget appears
SessionStart → local observer starts → observes events only, with no task write-back
```

An earlier release used a `Stop` block to request a model continuation. Codex passes the Hook reason to the model as a new user prompt, which can extend or interrupt the original task, so safe mode removes that automatic continuation path.

Standard Codex Desktop currently exposes no public endpoint that lets a plugin observer attach to the same App Server instance used by the desktop app and silently append a Widget after every completed turn. TurnCue therefore does not promise an automatic bottom-of-answer card on every turn. If the model misses the call, input validation fails, or the MCP server is unavailable, say “Show next steps,” “Refresh next-step suggestions,” or “显示建议卡片.”

## Installation

Requirements:

- The Codex desktop app; plugin management commands require a Codex CLI build with plugin support.
- Node.js 22.13 or newer.
- The current release is verified on macOS. Windows has not been verified.

Check the environment first:

```bash
codex --version
node --version
```

Then install the Marketplace and plugin:

```bash
codex plugin marketplace add xuhuawork/turncue
codex plugin add turncue@turncue
```

After installation:

1. Quit Codex completely and reopen it.
2. Run `codex plugin list --json` and confirm that the plugin is enabled.
3. Start a new task and say “Show next steps” to verify the MCP server and Widget.
4. For observer diagnostics, review and enable TurnCue's `SessionStart` Hook in `/hooks`. It only observes events and does not send messages or generate suggestion cards automatically.

Installing or enabling a plugin does not automatically trust its Hook. When an update changes the `SessionStart` Hook definition, Codex asks you to review and trust it again. You can leave the observer disabled and continue using manual or model-driven `show_next_steps` calls.

You do not need to say “Start TurnCue” before normal use. The manual command is the stable verification and recovery path. You can also ask the model to call `show_next_steps` after appropriate substantive answers in the current task.

## Migrating from `conversation-navigator`

If you installed the previous technical ID, remove the old plugin and Marketplace before installing TurnCue. Do not keep both installations because they may register duplicate MCP servers or Hooks.

```bash
codex plugin remove conversation-navigator@conversation-navigator
codex plugin marketplace remove conversation-navigator
codex plugin marketplace add xuhuawork/turncue
codex plugin add turncue@turncue
```

After migration, quit Codex completely and reopen it. In `/hooks`, disable any Hook that still points to the old `conversation-navigator` installation path, then start a new task and say “Show next steps.” Old cache or Hook-trust records may remain as inactive records, but they should not stay enabled.

## Quick verification

Confirm that the plugin is enabled:

```bash
codex plugin list --json
```

Then start a new task and run this sequence:

1. Send “Show next steps and give me 3 directions for testing TurnCue.”
2. Confirm that a Widget appears with 3 suggestions.
3. Single-click a suggestion, edit the draft, and select “Send to conversation.”
4. Change the language to English, the personality to Brainstorm, and the count to 5, then say “Show next steps” again.
5. Confirm that the new card contains 5 English suggestions.
6. Change to Chinese, Empathic, and 4 suggestions, say “刷新下一步建议,” and confirm that the new card contains 4 Chinese suggestions.
7. Send a normal task that does not request navigation. Confirm that the original task completes normally and no `Stop` Hook continuation is inserted.

Double-clicking a suggestion sends it immediately without first stopping in the editor.

![TurnCue English editing state with an editable draft and send action](./docs/images/turncue-editor-en.jpg)

## Usage

- Single click: place a suggestion in the Widget editor before sending.
- Double click: send the suggestion immediately.
- `Command/Ctrl + Enter`: send the current draft.
- Appearance menu: follow the system, use light or dark mode, and choose an accent color.
- Preference menu: choose the language, personality, and 3–5 suggestions per turn.
- Manual entry points: say “Show next steps,” “Refresh next-step suggestions,” or “显示建议卡片.”

Preferences are passed through the current task's model context and take effect on the next generation. The current release does not persist global preferences across tasks.

## Updating

```bash
codex plugin marketplace upgrade turncue
codex plugin remove turncue@turncue
codex plugin add turncue@turncue
```

After updating:

1. Quit Codex completely and reopen it.
2. Open `/hooks` and confirm that no legacy TurnCue `Stop` Hook is enabled. Review the current `SessionStart` Hook only if you want observer diagnostics.
3. Test “Show next steps” in a new task. Existing tasks may retain an older MCP, tool, or Widget snapshot.

## Disabling and uninstalling

- Stop lifecycle observation by disabling TurnCue's `SessionStart` observer in `/hooks`. The MCP server and manual cards remain available.
- Remove the plugin:

  ```bash
  codex plugin remove turncue@turncue
  ```

- If you no longer use any plugin from this repository, remove the Marketplace as well:

  ```bash
  codex plugin marketplace remove turncue
  ```

The `SessionStart` observer setting is global. The current release does not provide a per-task enable switch.

## Troubleshooting

1. Run `codex plugin list` and confirm that `turncue@turncue` is enabled.
2. Restart Codex completely and test in a new task.
3. Say “Show next steps” or “显示建议卡片.” If the card appears manually, the MCP server and Widget are usually healthy.
4. If a task is still interrupted by an automatic continuation, open `/hooks`, disable every legacy TurnCue `Stop` Hook that points to `auto-navigation-stop-hook.mjs`, reinstall the plugin, and start a new task.
5. Confirm that `node --version` meets the requirement.
6. If an update still shows the old UI, repeat the update flow and verify that the new task reads `widget-v16.html`.

## Privacy and data boundaries

- The Widget CSP has an empty external-domain allowlist.
- The Widget does not load remote scripts, images, or fonts, and it does not initiate network requests.
- The MCP server runs locally over stdio. The optional SessionStart observer watches lifecycle events only; it does not inject content into tasks, invoke a model continuation, or write a conversation database.
- The plugin stores no user profile, API key, or telemetry.
- Current task content, suggestion generation, language-preference synchronization, and drafts sent from the Widget still pass through the Codex host and current model under the user's existing Codex data settings.

Report security issues privately as described in [SECURITY.md](./SECURITY.md).

## Known limitations

- Model-driven tool invocation cannot guarantee a card on every turn. The manual entry point is more reliable.
- Standard Codex Desktop does not expose a same-instance attachment point for the App Server used by the desktop app, so the observer cannot silently append a card after every completed turn.
- The SessionStart observer provides observation only and does not trigger `show_next_steps`.
- Drafts, appearance, and navigation preferences do not persist across tasks and may reset after reload or restart.
- Auto language detection can choose incorrectly in heavily mixed Chinese-English requests; select a language manually to override it.
- Existing tasks may keep older tool or Widget snapshots.
- Windows has not been verified.

## Development

```bash
npm ci
npm run validate
```

`npm run build:plugin` synchronizes both READMEs, the Widget, and observer files, then bundles the MCP server and runtime dependencies into `plugins/turncue/mcp/server.mjs`. Plugin users do not need to build the bundle or run `npm install`.

Repository layout:

```text
.agents/plugins/marketplace.json       Codex Marketplace
mcp/                                   MCP and Widget sources
scripts/                               observer and plugin build scripts
plugins/turncue/                       Installable plugin package
tests/                                 observer, resource, and tool contract tests
```

## Compatibility scope

The Codex Desktop package provides the Widget and `show_next_steps` through a local stdio MCP server. Safe mode uses no `Stop` block, and the SessionStart observer does not write back to tasks. A general ChatGPT MCP App can reuse the Widget and tool after adding a Streamable HTTP MCP deployment. This repository cannot be installed directly as a ChatGPT App and does not promise automatic cards after every turn.

## License

[MIT](./LICENSE). See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for bundled dependency licenses.
