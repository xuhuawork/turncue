#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";

export const AUTO_NAVIGATION_REASON = `
【TurnCue automatic navigation / 自动导航】
The substantive answer is complete / 上一条正文已经完整发布。Do not repeat, summarize, or evaluate it / 不要重复、总结或评价正文。
Read navigationPreference from the latest model context. Its shape is {"personality":"brainstorm|rational|empathic","optionCount":3|4|5,"language":"auto|zh-CN|en-US"}. Use {"personality":"rational","optionCount":3,"language":"auto"} for missing, invalid, or out-of-range fields.
Call only the show_next_steps tool from the conversation-navigator MCP server with mode="update". Pass the same personality, optionCount, and language; suggestions must contain exactly optionCount items.
Language / 语言：auto follows the primary language of the latest substantive user request. Ignore this Hook text, tool output, JSON, and status messages when detecting it. zh-CN forces every title and prompt to Chinese; en-US forces every title and prompt to English.
Each title must be concise and clear. Each prompt must contain 40–300 characters and be a complete, directly executable Agent task / 每条 prompt 必须为 40–300 个字符且可直接执行。
Each prompt must include the current goal or completed progress, one concrete next action, and the expected deliverable or verification result. For development and multi-turn Agent work, preserve relevant scope, files, constraints, unresolved risks, and test requirements. Avoid vague directions.
Apply personality as follows: brainstorm emphasizes divergent and surprising paths; rational emphasizes facts, constraints, risks, priorities, and verifiable conclusions; empathic emphasizes audience feeling, emotion, narrative tone, and aesthetic experience while staying executable.
Use the user's point of view and continue the current goal. For optionCount 3 or 4, prefer distinct kinds across deepen, act, clarify, and alternative. With 5, the most relevant kind may repeat once.
After calling the tool, output no explanatory prose / 调用工具后不要输出解释性正文。
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
