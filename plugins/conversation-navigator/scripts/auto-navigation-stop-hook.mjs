#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";

export const AUTO_NAVIGATION_REASON = `
【自动导航：刷新下一步建议】
上一条正文已经完整发布。不要重复、总结或评价正文。
从最新模型上下文读取 navigationPreference，格式为 {"personality":"brainstorm|rational|empathic","optionCount":3|4|5}；字段缺失、越界或无效时使用 {"personality":"rational","optionCount":3}。
请根据完整对话只调用 conversation-navigator 的 show_next_steps 工具，mode="update"，并传入相同的 personality 与 optionCount；suggestions 必须恰好等于 optionCount。
每条 title 简洁明确；每条 prompt 必须是 40–300 字、可直接发送给 Agent 的完整任务指令。
prompt 需要包含：当前目标或已完成进度、一个具体下一步动作、期望的交付物或验证结果。
开发和多轮 Agent 任务还要保留必要的范围、文件、约束、未决风险与测试要求，避免“继续优化”“详细说明”“下一步怎么做”等空泛表达。
按 personality 生成建议：brainstorm 强调发散、意外联系和彼此明显不同的创意路径；rational 强调事实、约束、风险、优先级和可验证结论；empathic 强调受众感受、情绪、叙事语气与审美体验，同时保持任务可执行。
建议使用用户视角，延续当前目标。optionCount 为 3 或 4 时，优先使用不同的 kind 覆盖继续深入、转为行动、补充信息或替代方向；optionCount 为 5 时，允许一个最符合当前任务的 kind 有意重复。
调用工具后不要再输出解释性正文。
`.trim();

export function buildStopHookResponse(input) {
  if (
    !input ||
    input.hook_event_name !== "Stop" ||
    input.stop_hook_active ||
    typeof input.last_assistant_message !== "string" ||
    !input.last_assistant_message.trim()
  ) {
    return {};
  }

  return {
    decision: "block",
    reason: AUTO_NAVIGATION_REASON,
  };
}

async function readStdin() {
  let value = "";

  for await (const chunk of process.stdin) {
    value += chunk;
  }

  return value;
}

async function main() {
  try {
    const raw = await readStdin();
    const input = JSON.parse(raw);
    process.stdout.write(`${JSON.stringify(buildStopHookResponse(input))}\n`);
  } catch {
    process.stdout.write("{}\n");
  }
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  await main();
}
