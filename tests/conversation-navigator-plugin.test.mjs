import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const pluginRoot = new URL("../plugins/conversation-navigator/", import.meta.url);
const pluginServerPath = fileURLToPath(new URL("mcp/server.mjs", pluginRoot));

test("plugin package uses portable MCP and Hook paths", async () => {
  const manifest = JSON.parse(
    await readFile(new URL(".codex-plugin/plugin.json", pluginRoot), "utf8"),
  );
  const mcp = JSON.parse(
    await readFile(new URL(".mcp.json", pluginRoot), "utf8"),
  );
  const hooks = JSON.parse(
    await readFile(new URL("hooks/hooks.json", pluginRoot), "utf8"),
  );
  const serialized = JSON.stringify({ manifest, mcp, hooks });

  assert.equal(manifest.name, "conversation-navigator");
  assert.equal(manifest.mcpServers, "./.mcp.json");
  assert.deepEqual(Object.keys(hooks), ["hooks"]);
  assert.equal(mcp.mcpServers["conversation-navigator"].cwd, ".");
  assert.deepEqual(mcp.mcpServers["conversation-navigator"].args, [
    "./mcp/server.mjs",
  ]);
  assert.match(
    hooks.hooks.Stop[0].hooks[0].command,
    /\$\{PLUGIN_ROOT\}\/scripts\/auto-navigation-stop-hook\.mjs/,
  );
  assert.doesNotMatch(serialized, /\/Users\//);
});

test("plugin build keeps Widget and Hook synchronized", async () => {
  const [
    sourceWidget,
    pluginWidget,
    sourceHook,
    pluginHook,
    sourceReadme,
    pluginReadme,
    sourceLicense,
    pluginLicense,
    sourceSecurity,
    pluginSecurity,
    sourceNotices,
    pluginNotices,
  ] = await Promise.all([
    readFile(new URL("../mcp/prompt-guide-widget.html", import.meta.url), "utf8"),
    readFile(new URL("mcp/prompt-guide-widget.html", pluginRoot), "utf8"),
    readFile(
      new URL("../scripts/auto-navigation-stop-hook.mjs", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("scripts/auto-navigation-stop-hook.mjs", pluginRoot),
      "utf8",
    ),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("README.md", pluginRoot), "utf8"),
    readFile(new URL("../LICENSE", import.meta.url), "utf8"),
    readFile(new URL("LICENSE", pluginRoot), "utf8"),
    readFile(new URL("../SECURITY.md", import.meta.url), "utf8"),
    readFile(new URL("SECURITY.md", pluginRoot), "utf8"),
    readFile(new URL("../THIRD_PARTY_NOTICES.md", import.meta.url), "utf8"),
    readFile(new URL("THIRD_PARTY_NOTICES.md", pluginRoot), "utf8"),
  ]);

  assert.equal(pluginWidget, sourceWidget);
  assert.equal(pluginHook, sourceHook);
  assert.equal(pluginReadme, sourceReadme);
  assert.equal(pluginLicense, sourceLicense);
  assert.equal(pluginSecurity, sourceSecurity);
  assert.equal(pluginNotices, sourceNotices);

  const runtimeLicenses = await readdir(
    new URL("licenses/runtime/", pluginRoot),
  );
  assert.ok(runtimeLicenses.includes("DEPENDENCIES.md"));
  assert.ok(runtimeLicenses.length >= 10);
});

test(
  "bundled plugin MCP exposes the Widget and show_next_steps",
  { timeout: 15_000 },
  async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [pluginServerPath],
      stderr: "pipe",
    });
    const client = new Client({
      name: "conversation-navigator-plugin-test",
      version: "1.0.0",
    });

    try {
      await client.connect(transport);
      const { tools } = await client.listTools();
      assert.ok(tools.some(({ name }) => name === "show_next_steps"));

      const resource = await client.readResource({
        uri: "ui://prompt-guide/widget-v15.html",
      });
      assert.equal(resource.contents[0].mimeType, "text/html;profile=mcp-app");
      assert.match(resource.contents[0].text, /personalityPreference/);
    } finally {
      await client.close();
    }
  },
);
