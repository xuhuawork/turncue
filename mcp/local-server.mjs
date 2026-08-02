import { readFile } from "node:fs/promises";

import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const RESOURCE_URI = "ui://prompt-guide/widget-v16.html";
const RESOURCE_URIS = [
  "ui://prompt-guide/widget-v1.html",
  "ui://prompt-guide/widget-v2.html",
  "ui://prompt-guide/widget-v3.html",
  "ui://prompt-guide/widget-v4.html",
  "ui://prompt-guide/widget-v5.html",
  "ui://prompt-guide/widget-v6.html",
  "ui://prompt-guide/widget-v7.html",
  "ui://prompt-guide/widget-v8.html",
  "ui://prompt-guide/widget-v9.html",
  "ui://prompt-guide/widget-v10.html",
  "ui://prompt-guide/widget-v11.html",
  "ui://prompt-guide/widget-v12.html",
  "ui://prompt-guide/widget-v13.html",
  "ui://prompt-guide/widget-v14.html",
  "ui://prompt-guide/widget-v15.html",
  RESOURCE_URI,
];
const widgetHtml = await readFile(
  new URL("./prompt-guide-widget.html", import.meta.url),
  "utf8",
);

const suggestionKindSchema = z.enum([
  "deepen",
  "clarify",
  "act",
  "alternative",
]);

const navigationPersonalitySchema = z.enum([
  "brainstorm",
  "rational",
  "empathic",
]);

const navigationOptionCountSchema = z.number().int().min(3).max(5);
const navigationLanguageSchema = z.enum(["auto", "zh-CN", "en-US"]);

const inputSchema = z
  .object({
    mode: z.enum(["activate", "update"]),
    topic: z.string().trim().min(1).max(80).optional(),
    personality: navigationPersonalitySchema.optional(),
    optionCount: navigationOptionCountSchema.optional(),
    language: navigationLanguageSchema
      .optional()
      .describe(
        "TurnCue suggestion language: auto follows the latest substantive user request; zh-CN or en-US forces that language.",
      ),
    suggestions: z
      .array(
        z.object({
          title: z.string().trim().min(1).max(32),
          prompt: z.string().trim().min(40).max(300),
          kind: suggestionKindSchema,
        }),
      )
      .min(3)
      .max(5),
  })
  .superRefine((value, context) => {
    if (
      value.optionCount !== undefined &&
      value.suggestions.length !== value.optionCount
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["suggestions"],
        message: `suggestions must contain exactly ${value.optionCount} items / 必须恰好包含 ${value.optionCount} 条`,
      });
    }
  });

const outputSchema = z.object({
  version: z.string(),
  locale: z.enum(["zh-CN", "en-US"]),
  mode: z.enum(["activate", "update"]),
  topic: z.string().optional(),
  personality: navigationPersonalitySchema,
  optionCount: navigationOptionCountSchema,
  language: navigationLanguageSchema,
  suggestions: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      prompt: z.string(),
      kind: suggestionKindSchema,
    }),
  ),
});

const instructions = `
TurnCue is a local bilingual conversation-navigation service / TurnCue 是本机双语对话导航服务。

Before an automatic refresh, read the latest combined TurnCue state containing navigationPreference and navigationTask. When navigationTask.status="in_progress", compare its prompt with the latest substantive user request and inspect the full conversation for unfinished actions, deliverables, or required verification / 未完成动作、交付物或验证。If safe in-scope work remains, continue the original task / 继续原任务 in the same continuation before using this tool. Call show_next_steps only after the task is genuinely closed / 真正闭环. If the task is blocked or waiting for user input or authorization / 等待用户输入或授权, stop without calling this tool.

After the closure gate passes, read navigationPreference and pass personality, optionCount, and language. Defaults are personality="rational", optionCount=3, and language="auto". The number of suggestions must equal optionCount.

Language policy / 语言规则：language="auto" follows the primary language of the latest substantive user request, ignoring observer metadata, tool output, JSON, and status messages. language="zh-CN" forces Chinese titles and prompts. language="en-US" forces English titles and prompts. Keep every title and prompt in the selected language.

personality="brainstorm" expands into bold, clearly different ideas; personality="rational" prioritizes evidence, constraints, risks, tradeoffs, and verification; personality="empathic" prioritizes audience feeling, tone, aesthetics, sensory detail, and emotional resonance while remaining executable. These strategies do not change the model temperature.

For 3–4 suggestions, prefer distinct kinds. With 5 suggestions, the most useful kind may repeat once. Widget preference changes apply to the next generation.

Call this tool when the model determines the current task is genuinely closed and navigation is useful, or when the user asks to expand, display, or refresh next steps. Use mode="activate" for the first explicit display and mode="update" for later model-driven or explicit refreshes.

Each prompt must be 40–300 characters and directly executable by an Agent. Include the current goal or completed progress, one concrete next action, and the expected deliverable, decision, or verification result. Preserve relevant scope, files, constraints, unresolved risks, and test requirements for development or multi-turn work. Avoid vague requests such as “continue optimizing” or “tell me more.”

Safe mode never uses a blocking Stop continuation. The optional SessionStart observer is read-only and does not request this tool / 安全模式不会使用阻断式 Stop 续写；可选 SessionStart observer 只读观察，不会请求此工具。
`.trim();

const toolDescription = `
Use this when TurnCue should display selectable, editable, and sendable next-step cards in the current conversation / 用于在当前对话中显示可选择、可编辑、可发送的下一步卡片。

The current model generates suggestions from the full conversation and passes them as tool arguments. Call it for an explicit user request or a model-driven refresh after genuine task closure.

For an automatic refresh, first read navigationTask. If status="in_progress" and any requested action or verification remains unfinished / 未完成, continue the original task / 继续原任务 before calling this tool. Only call after genuine closure / 真正闭环. When blocked or waiting for user input or authorization / 等待用户输入或授权, do not call it.

Each prompt must contain 40–300 characters and be a complete Agent-ready task with the current goal or progress, a concrete action, and an expected output or verification standard. Preserve necessary scope, constraints, files, risks, and tests for multi-turn work.

Read personality, optionCount, and language from navigationPreference. Defaults: rational, 3, auto. language="auto" follows the latest substantive user request; zh-CN or en-US forces all titles and prompts into that language / auto 跟随最近一次实质用户请求，手动语言值强制对应语言。
`.trim();

function stableHash(value) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36).padStart(7, "0");
}

function normalizeLocale(value) {
  if (typeof value === "string" && value.trim().toLowerCase().startsWith("en")) {
    return "en-US";
  }

  return "zh-CN";
}

function inferSuggestionLocale(suggestions) {
  const content = suggestions
    .map(({ title, prompt }) => `${title}\n${prompt}`)
    .join("\n");
  const hanCount = content.match(/\p{Script=Han}/gu)?.length ?? 0;
  const latinCount = content.match(/[A-Za-z]/g)?.length ?? 0;

  if (hanCount === 0 && latinCount === 0) {
    return null;
  }

  return hanCount >= Math.max(1, Math.ceil(latinCount * 0.08))
    ? "zh-CN"
    : "en-US";
}

function resolveLocale(language, localeHint, suggestions) {
  if (language === "zh-CN" || language === "en-US") {
    return language;
  }

  return inferSuggestionLocale(suggestions) ?? normalizeLocale(localeHint);
}

function createOutput(input, localeHint) {
  const parsed = inputSchema.parse(input);
  const personality = parsed.personality ?? "rational";
  const optionCount = parsed.optionCount ?? parsed.suggestions.length;
  const language = parsed.language ?? "auto";
  const locale = resolveLocale(language, localeHint, parsed.suggestions);
  const normalized = {
    ...parsed,
    personality,
    optionCount,
    language,
    locale,
  };
  const payloadHash = stableHash(JSON.stringify(normalized));

  return {
    version: `v1-${payloadHash}`,
    locale,
    mode: parsed.mode,
    ...(parsed.topic ? { topic: parsed.topic } : {}),
    personality,
    optionCount,
    language,
    suggestions: parsed.suggestions.map((suggestion, index) => ({
      id: `next-${stableHash(
        `${language}:${locale}:${index}:${suggestion.kind}:${suggestion.title}:${suggestion.prompt}`,
      )}`,
      ...suggestion,
    })),
  };
}

const server = new McpServer(
  {
    name: "turncue",
    version: "0.4.0",
  },
  {
    instructions,
  },
);

registerAppTool(
  server,
  "show_next_steps",
  {
    title: "TurnCue · Next steps / 下一步",
    description: toolDescription,
    inputSchema,
    outputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
    _meta: {
      ui: {
        resourceUri: RESOURCE_URI,
        visibility: ["model"],
      },
      "openai/outputTemplate": RESOURCE_URI,
      "openai/toolInvocation/invoking": "TurnCue 正在准备 / Preparing…",
      "openai/toolInvocation/invoked": "TurnCue 已更新 / Ready",
    },
  },
  async (input, extra) => {
    const localeHint =
      extra._meta?.["openai/locale"] ?? extra._meta?.locale ?? "zh-CN";
    const output = createOutput(input, localeHint);
    const summary =
      output.locale === "en-US"
        ? `TurnCue generated ${output.suggestions.length} next-step suggestions in ${output.personality} mode.`
        : `TurnCue 已按 ${output.personality} 模式生成 ${output.suggestions.length} 条下一步建议。`;

    return {
      content: [
        {
          type: "text",
          text: summary,
        },
      ],
      structuredContent: output,
    };
  },
);

for (const resourceUri of RESOURCE_URIS) {
  const version = resourceUri.match(/widget-(v\d+)\.html$/)?.[1] ?? "current";

  registerAppResource(
    server,
    `TurnCue ${version}`,
    resourceUri,
    {
      title: "TurnCue",
      description:
        "Choose a next step, edit it, and send it to this conversation / 选择下一步，编辑后发送到当前对话。",
      _meta: {
        ui: {
          prefersBorder: true,
          csp: {
            connectDomains: [],
            resourceDomains: [],
          },
        },
      },
    },
    async () => ({
      contents: [
        {
          uri: resourceUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: widgetHtml,
          _meta: {
            ui: {
              prefersBorder: true,
              csp: {
                connectDomains: [],
                resourceDomains: [],
              },
            },
            "openai/widgetDescription":
              "TurnCue: choose a next step, edit it, and send it / 选择下一步，编辑后发送。",
            "openai/widgetPrefersBorder": true,
            "openai/widgetCSP": {
              connect_domains: [],
              resource_domains: [],
            },
          },
        },
      ],
    }),
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
