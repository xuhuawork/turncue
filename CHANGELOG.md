# Changelog

## 0.2.0 - 2026-07-31

- Renamed the user-facing product to TurnCue while keeping `conversation-navigator` as the stable technical and installation ID.
- Added automatic, Chinese, and English language modes for Widget controls and generated suggestions.
- Added bilingual personality labels, starter prompts, installation guidance, upgrade guidance, and verification steps.
- Advanced the Widget resource contract to `widget-v16.html` while preserving compatibility aliases for earlier resource URIs.
- Added build and regression coverage for the English README, TurnCue branding, and bilingual plugin metadata.

## 0.1.1 - 2026-07-31

- Kept the Hook manifest compatible with Codex CLI 0.140.0 so the Stop Hook can be loaded, reviewed, trusted, and enabled.
- Added a regression check for unsupported top-level Hook manifest fields.
- Documented the two-turn verification and plugin update flow.
- Bundled security, license, and production dependency notices inside the installable plugin.

## 0.1.0 - 2026-07-31

- Added the `show_next_steps` MCP tool and self-contained Widget.
- Added three navigation personalities and configurable 3–5 suggestions.
- Added a Codex Stop Hook that requests the Widget after the main response completes.
- Added light, dark, automatic theme modes and editable follow-up prompts.
