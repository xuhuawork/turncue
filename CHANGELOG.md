# Changelog

## 0.4.0 - 2026-08-02

- Unified the product and technical identity as TurnCue / `turncue` across the repository, Marketplace, plugin, and MCP service.
- Updated the canonical GitHub repository to `xuhuawork/turncue`, the install target to `turncue@turncue`, and the installable plugin directory to `plugins/turncue`.
- Added Chinese and English migration instructions for removing the previous `conversation-navigator` installation before installing TurnCue, preventing duplicate MCP servers or Hooks.
- Preserved the 0.3 safe-mode behavior while advancing the public release to 0.4.0.

## 0.3.0 - 2026-08-02

- Replaced the blocking `Stop` continuation design with safe mode so TurnCue cannot interrupt an active task by injecting a Hook reason as a new model prompt.
- Added an optional `SessionStart` observer boundary: it observes lifecycle events only and never writes back to the task or invokes `show_next_steps`.
- Kept model-driven and manual `show_next_steps` entry points for standard Codex Desktop.
- Documented that standard Codex Desktop provides no public same-App-Server attachment endpoint for the observer, so TurnCue does not promise a bottom-of-answer card after every turn.
- Added recovery guidance for disabling legacy cached TurnCue `Stop` Hook definitions.

## 0.2.0 - 2026-07-31

- Renamed the user-facing product to TurnCue while keeping `conversation-navigator` as the stable technical and installation ID.
- Added automatic, Chinese, and English language modes for Widget controls and generated suggestions.
- Added bilingual personality labels, starter prompts, installation guidance, upgrade guidance, and verification steps.
- Advanced the Widget resource contract to `widget-v16.html` while preserving compatibility aliases for earlier resource URIs.
- Added build and regression coverage for the English README, TurnCue branding, and bilingual plugin metadata.

## 0.1.1 - 2026-07-31

- Kept the legacy Hook manifest compatible with Codex CLI 0.140.0 so the then-current Stop Hook could be loaded, reviewed, trusted, and enabled. Safe mode removes this design in the next release.
- Added a regression check for unsupported top-level Hook manifest fields.
- Documented the two-turn verification and plugin update flow.
- Bundled security, license, and production dependency notices inside the installable plugin.

## 0.1.0 - 2026-07-31

- Added the `show_next_steps` MCP tool and self-contained Widget.
- Added three navigation personalities and configurable 3–5 suggestions.
- Added the original Codex Stop Hook that requested the Widget after the main response completed. Safe mode removes this legacy continuation path in the next release.
- Added light, dark, automatic theme modes and editable follow-up prompts.
