import { readFile } from "node:fs/promises";

import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const RESOURCE_URI = "ui://prompt-guide/widget-v15.html";
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

const inputSchema = z
  .object({
    mode: z.enum(["activate", "update"]),
    topic: z.string().trim().min(1).max(80).optional(),
    personality: navigationPersonalitySchema.optional(),
    optionCount: navigationOptionCountSchema.optional(),
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
        message: `suggestions 必须恰好包含 ${value.optionCount} 条`,
      });
    }
  });

const outputSchema = z.object({
  version: z.string(),
  locale: z.string(),
  mode: z.enum(["activate", "update"]),
  topic: z.string().optional(),
  personality: navigationPersonalitySchema,
  optionCount: navigationOptionCountSchema,
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
这是本机中文对话导航服务。

用户说“开启对话导航”后，在当前对话的每次实质回答末尾追加一个紧凑的“下一步”区域。读取最近一次 ui/update-model-context 提供的 navigationPreference，并把 personality 与 optionCount 传给工具；没有偏好时使用 rational 和 3。生成数量必须与 optionCount 完全一致，任务意图必须延续当前目标并避免重复已完成内容。

personality="brainstorm" 时扩大联想、提供大胆且彼此不同的创作方向；personality="rational" 时优先证据、约束、风险、取舍和验证；personality="empathic" 时优先受众感受、语气、美学、感官细节和情绪共鸣，同时保持任务可执行。这是下一步建议的生成策略，不代表修改底层模型 temperature。

3–4 条建议优先覆盖不同的 kind；5 条时允许最有价值的 kind 有意重复一次。用户在 Widget 修改偏好后，从下一次生成建议开始生效。

当自动导航续回合明确要求调用 show_next_steps，或用户说“展开下一步”“显示建议卡片”“刷新下一步建议”时，调用本工具。首次显式展开使用 mode="activate"，后续刷新和自动导航使用 mode="update"。

工具中的每条 prompt 必须是 40–300 字、可直接交给 Agent 执行的完整中文任务：交代当前目标或已完成进度、一个具体下一步动作，以及期望的交付物、决策或验证结果。与开发和多轮 Agent 工作相关时，保留必要的范围、文件、约束、未决风险和测试要求。避免“继续优化”“详细说明”“下一步怎么做”等空泛表达。

用户说“关闭对话导航”后停止追加建议。简单确认、拒绝、纯状态通知或已经彻底结束的任务可以不显示。
`.trim();

const toolDescription = `
在当前对话中显示可选择、可编辑、可发送的中文下一步任务卡片。

用户明确要求显示卡片，或自动导航续回合要求刷新卡片时调用。建议由当前模型根据完整对话生成并作为参数传入。

每条 title 用于快速辨认方向；每条 prompt 必须是 40–300 字、可以原样发送给 Agent 的完整任务，包含当前目标或进度、具体动作、期望输出或验证标准。多轮任务需要带上必要的范围、约束、文件、风险和测试要求，避免空泛建议。

读取模型上下文里的 navigationPreference；若存在，原样传入 personality 和 optionCount，并生成恰好 optionCount 条建议。若不存在，使用 personality="rational"、optionCount=3。三种 personality 的含义分别为创意脑暴、理性推演和感性共鸣。
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
  if (typeof value !== "string") {
    return "zh-CN";
  }

  const locale = value.trim().slice(0, 35);
  return /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale)
    ? locale
    : "zh-CN";
}

function createOutput(input, locale) {
  const parsed = inputSchema.parse(input);
  const personality = parsed.personality ?? "rational";
  const optionCount = parsed.optionCount ?? parsed.suggestions.length;
  const normalized = {
    ...parsed,
    personality,
    optionCount,
  };
  const payloadHash = stableHash(JSON.stringify(normalized));

  return {
    version: `v1-${payloadHash}`,
    locale: normalizeLocale(locale),
    mode: parsed.mode,
    ...(parsed.topic ? { topic: parsed.topic } : {}),
    personality,
    optionCount,
    suggestions: parsed.suggestions.map((suggestion, index) => ({
      id: `next-${stableHash(
        `${index}:${suggestion.kind}:${suggestion.title}:${suggestion.prompt}`,
      )}`,
      ...suggestion,
    })),
  };
}

const server = new McpServer(
  {
    name: "conversation-navigator",
    version: "1.0.0",
  },
  {
    instructions,
  },
);

registerAppTool(
  server,
  "show_next_steps",
  {
    title: "显示中文下一步建议",
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
      "openai/toolInvocation/invoking": "正在整理下一步建议…",
      "openai/toolInvocation/invoked": "下一步建议已更新",
    },
  },
  async (input, extra) => {
    const locale =
      extra._meta?.locale ?? extra._meta?.["openai/locale"] ?? "zh-CN";
    const output = createOutput(input, locale);

    return {
      content: [
        {
          type: "text",
          text: `已按 ${output.personality} 模式生成 ${output.suggestions.length} 条中文下一步建议。`,
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
    `中文对话导航 ${version}`,
    resourceUri,
    {
      title: "中文对话导航",
      description: "选择建议，在内置编辑框中修改后发送到当前对话。",
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
              "中文对话导航：选择下一步方向，在内置编辑框中修改后发送。",
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
