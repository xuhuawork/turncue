import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const pluginRoot = new URL("../plugins/turncue/", import.meta.url);
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

  assert.equal(manifest.name, "turncue");
  assert.equal(manifest.version, "0.4.0");
  assert.equal(manifest.interface.displayName, "TurnCue");
  assert.match(manifest.description, /TurnCue/);
  assert.match(manifest.description, /下一步建议/);
  assert.match(manifest.description, /next-step suggestions/i);
  assert.ok(
    manifest.interface.defaultPrompt.some((prompt) => /开启 TurnCue/.test(prompt)),
  );
  assert.ok(
    manifest.interface.defaultPrompt.some((prompt) => /Start TurnCue/.test(prompt)),
  );
  assert.equal(manifest.mcpServers, "./.mcp.json");
  assert.deepEqual(Object.keys(hooks), ["hooks"]);
  assert.equal(mcp.mcpServers.turncue.cwd, ".");
  assert.deepEqual(mcp.mcpServers.turncue.args, [
    "./mcp/server.mjs",
  ]);
  assert.equal(Object.hasOwn(hooks.hooks, "Stop"), false);
  assert.deepEqual(Object.keys(hooks.hooks), ["SessionStart"]);
  assert.match(
    hooks.hooks.SessionStart[0].hooks[0].command,
    /\$\{PLUGIN_ROOT\}\/scripts\/session-start-turncue\.mjs/,
  );
  assert.equal(hooks.hooks.SessionStart[0].matcher, "startup|resume");
  assert.doesNotMatch(serialized, /auto-navigation-stop-hook/);
  assert.doesNotMatch(serialized, /\/Users\//);
});

test("plugin build keeps Widget and observer synchronized", async () => {
  const [
    sourceWidget,
    pluginWidget,
    sourceSessionStart,
    pluginSessionStart,
    sourceObserver,
    pluginObserver,
    sourceReadme,
    pluginReadme,
    sourceReadmeEnglish,
    pluginReadmeEnglish,
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
      new URL("../scripts/session-start-turncue.mjs", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("scripts/session-start-turncue.mjs", pluginRoot),
      "utf8",
    ),
    readFile(
      new URL("../scripts/turncue-observer.mjs", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("scripts/turncue-observer.mjs", pluginRoot),
      "utf8",
    ),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("README.md", pluginRoot), "utf8"),
    readFile(new URL("../README.en.md", import.meta.url), "utf8"),
    readFile(new URL("README.en.md", pluginRoot), "utf8"),
    readFile(new URL("../LICENSE", import.meta.url), "utf8"),
    readFile(new URL("LICENSE", pluginRoot), "utf8"),
    readFile(new URL("../SECURITY.md", import.meta.url), "utf8"),
    readFile(new URL("SECURITY.md", pluginRoot), "utf8"),
    readFile(new URL("../THIRD_PARTY_NOTICES.md", import.meta.url), "utf8"),
    readFile(new URL("THIRD_PARTY_NOTICES.md", pluginRoot), "utf8"),
  ]);

  assert.equal(pluginWidget, sourceWidget);
  assert.match(sourceWidget, /const I18N =/);
  assert.match(sourceWidget, /languagePreference/);
  const inlineScript = sourceWidget.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inlineScript, "Widget must contain an inline script");
  assert.doesNotThrow(() => new Function(inlineScript));
  assert.equal(pluginSessionStart, sourceSessionStart);
  assert.equal(pluginObserver, sourceObserver);
  assert.equal(pluginReadme, sourceReadme);
  assert.equal(pluginReadmeEnglish, sourceReadmeEnglish);
  assert.match(sourceReadme, /\[English\]\(\.\/README\.en\.md\)/);
  assert.match(sourceReadmeEnglish, /\[中文\]\(\.\/README\.md\)/);
  assert.match(sourceReadme, /turncue-widget-zh\.jpg/);
  assert.match(sourceReadmeEnglish, /turncue-widget-en\.jpg/);
  assert.equal(pluginLicense, sourceLicense);
  assert.equal(pluginSecurity, sourceSecurity);
  assert.equal(pluginNotices, sourceNotices);

  const sourceImages = await readdir(
    new URL("../docs/images/", import.meta.url),
  );
  const pluginImages = await readdir(new URL("docs/images/", pluginRoot));
  assert.deepEqual(pluginImages.sort(), sourceImages.sort());

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
      name: "turncue-plugin-test",
      version: "1.0.0",
    });

    try {
      await client.connect(transport);
      const { tools } = await client.listTools();
      const showNextSteps = tools.find(
        ({ name }) => name === "show_next_steps",
      );
      assert.ok(showNextSteps);
      assert.match(showNextSteps.description, /navigationTask/);
      assert.match(showNextSteps.description, /in_progress/);
      assert.match(showNextSteps.description, /继续原任务/);
      assert.match(showNextSteps.description, /真正闭环/);
      assert.match(showNextSteps.description, /等待用户输入或授权/);
      assert.deepEqual(showNextSteps.inputSchema.properties.language.enum, [
        "auto",
        "zh-CN",
        "en-US",
      ]);

      const resource = await client.readResource({
        uri: "ui://prompt-guide/widget-v16.html",
      });
      assert.equal(resource.contents[0].mimeType, "text/html;profile=mcp-app");
      assert.match(resource.contents[0].text, /personalityPreference/);
      assert.match(resource.contents[0].text, /TurnCue/);
      assert.match(resource.contents[0].text, /navigationTask/);
      assert.match(resource.contents[0].text, /status:\s*"in_progress"/);
      assert.match(
        resource.contents[0].text,
        /navigationTask\.version === version/,
      );

      for (const uri of [
        "ui://prompt-guide/widget-v1.html",
        "ui://prompt-guide/widget-v15.html",
      ]) {
        const alias = await client.readResource({ uri });
        assert.equal(alias.contents[0].mimeType, "text/html;profile=mcp-app");
        assert.match(alias.contents[0].text, /TurnCue/);
      }

      const englishArguments = {
        mode: "update",
        personality: "rational",
        optionCount: 3,
        language: "en-US",
        suggestions: [
          {
            title: "Verify the bilingual contract",
            prompt:
              "Inspect the TurnCue MCP schema and return a concise verification report covering language selection, deterministic versions, resource aliases, and the exact commands used for validation.",
            kind: "deepen",
          },
          {
            title: "Run the release checks",
            prompt:
              "Run the complete TurnCue validation suite, record every passing check, and report any remaining release risk with a concrete reproduction step and an owner-ready next action.",
            kind: "act",
          },
          {
            title: "Confirm compatibility",
            prompt:
              "Review the current technical identifiers and confirm that turncue is used consistently for plugin installation, hooks, MCP discovery, and repository documentation.",
            kind: "clarify",
          },
        ],
      };
      const english = await client.callTool({
        name: "show_next_steps",
        arguments: englishArguments,
      });
      const englishRetry = await client.callTool({
        name: "show_next_steps",
        arguments: englishArguments,
      });

      assert.equal(english.structuredContent.language, "en-US");
      assert.equal(english.structuredContent.locale, "en-US");
      assert.equal(english.structuredContent.suggestions.length, 3);
      assert.equal(
        englishRetry.structuredContent.version,
        english.structuredContent.version,
      );
      assert.deepEqual(
        englishRetry.structuredContent.suggestions.map(({ id }) => id),
        english.structuredContent.suggestions.map(({ id }) => id),
      );

      const legacy = await client.callTool({
        name: "show_next_steps",
        arguments: {
          mode: "activate",
          suggestions: [
            {
              title: "确认旧版输入兼容",
              prompt:
                "请检查没有 language 字段的旧版工具输入仍可正常生成建议，并输出解析后的默认语言偏好、实际语言、版本和确定性标识，作为兼容性验收记录。",
              kind: "clarify",
            },
            {
              title: "核对历史资源别名",
              prompt:
                "请依次读取 Widget v1 与 v15 的历史资源 URI，确认它们仍返回当前 TurnCue 内容与正确 MIME，并记录任何会导致旧任务加载失败的差异。",
              kind: "deepen",
            },
            {
              title: "整理升级验证结果",
              prompt:
                "请把本轮双语升级的构建、测试、资源兼容和安装包校验结果整理成发布摘要，明确通过项、已知限制以及用户升级后需要重新执行的步骤。",
              kind: "act",
            },
          ],
        },
      });
      assert.equal(legacy.structuredContent.language, "auto");
      assert.equal(legacy.structuredContent.locale, "zh-CN");
    } finally {
      await client.close();
    }
  },
);
