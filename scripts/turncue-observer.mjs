#!/usr/bin/env node

import { open, stat, unlink } from "node:fs/promises";
import process from "node:process";
import { pathToFileURL } from "node:url";

const DEFAULT_TIMEOUT_MS = 24 * 60 * 60 * 1000;
const DEFAULT_POLL_MS = 250;

export function parseTaskCompleteEvents(jsonl) {
  const events = [];
  for (const line of jsonl.split("\n")) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (
        event.type === "event_msg" &&
        event.payload?.type === "task_complete"
      ) {
        events.push(event.payload);
      }
    } catch {
      // The last transcript line can be partial while Codex is appending it.
    }
  }
  return events;
}

export function createDispatchKey({ sessionId, turnId }) {
  if (typeof sessionId !== "string" || !sessionId.trim()) {
    throw new Error("sessionId must not be empty");
  }
  if (typeof turnId !== "string" || !turnId.trim()) {
    throw new Error("turnId must not be empty");
  }
  return `${sessionId.trim()}:${turnId.trim()}`;
}

const WAITING_PATTERNS = [
  /(?:请|需要|需)(?:你|您)?(?:先)?(?:提供|确认|选择|回复|授权|批准|开启|上传|输入)/u,
  /(?:等待|等)(?:你|您)(?:回复|确认|选择|授权|提供|开启)/u,
  /(?:确认|回复|授权|开启|提供)(?:后|以后).{0,24}(?:继续|再处理|再开始)/u,
  /(?:please|kindly)\s+(?:provide|confirm|choose|reply|authorize|approve|enable|upload|enter)\b/iu,
  /(?:waiting for|need)\s+(?:your|you to)\s+(?:reply|confirmation|choice|approval|authorization|input)/iu,
  /(?:once|after)\s+you\s+(?:confirm|reply|authorize|approve|enable|provide).{0,40}\bcontinue\b/iu,
];

export function classifyCompletion(lastAgentMessage) {
  if (typeof lastAgentMessage !== "string" || !lastAgentMessage.trim()) {
    return "waiting";
  }
  return WAITING_PATTERNS.some((pattern) => pattern.test(lastAgentMessage))
    ? "waiting"
    : "completed";
}

export function resolveAutomationMode() {
  return "observer_only";
}

export function parseArgs(argv) {
  const options = {
    timeoutMs: DEFAULT_TIMEOUT_MS,
    pollMs: DEFAULT_POLL_MS,
    host: "codex_desktop",
    watch: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    switch (argument) {
      case "--session":
        options.sessionId = value;
        index += 1;
        break;
      case "--transcript":
        options.transcriptPath = value;
        index += 1;
        break;
      case "--cwd":
        options.cwd = value;
        index += 1;
        break;
      case "--host":
        options.host = value;
        index += 1;
        break;
      case "--shared-endpoint":
        options.sharedEndpoint = value;
        index += 1;
        break;
      case "--host-pid":
        options.hostPid = Number(value);
        index += 1;
        break;
      case "--lock-file":
        options.lockFile = value;
        index += 1;
        break;
      case "--timeout-ms":
        options.timeoutMs = Number(value);
        index += 1;
        break;
      case "--poll-ms":
        options.pollMs = Number(value);
        index += 1;
        break;
      case "--watch":
        options.watch = true;
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!options.sessionId) throw new Error("Missing --session");
  if (!options.transcriptPath) throw new Error("Missing --transcript");
  return options;
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readFrom(filePath, start) {
  const file = await open(filePath, "r");
  try {
    const fileStat = await file.stat();
    if (fileStat.size < start) {
      throw new Error("Transcript was truncated; observer stopped fail-closed");
    }
    const length = fileStat.size - start;
    if (length === 0) return { text: "", nextOffset: start };
    const buffer = Buffer.alloc(length);
    await file.read(buffer, 0, length, start);
    return { text: buffer.toString("utf8"), nextOffset: fileStat.size };
  } finally {
    await file.close();
  }
}

export async function run(options) {
  const transcriptStat = await stat(options.transcriptPath);
  const mode = resolveAutomationMode(options);
  const seen = new Set();
  const startedAt = Date.now();
  let offset = transcriptStat.size;
  let remainder = "";

  // Current Codex Desktop exposes no shared App Server endpoint to plugin
  // sidecars. The observer therefore remains read-only and never resumes the
  // session, starts a turn, or invokes show_next_steps.
  if (mode !== "observer_only") return;

  while (Date.now() - startedAt <= options.timeoutMs) {
    if (!isProcessAlive(options.hostPid)) return;
    const appended = await readFrom(options.transcriptPath, offset);
    offset = appended.nextOffset;
    const combined = remainder + appended.text;
    const lastNewline = combined.lastIndexOf("\n");

    if (lastNewline >= 0) {
      const completeLines = combined.slice(0, lastNewline + 1);
      remainder = combined.slice(lastNewline + 1);
      for (const event of parseTaskCompleteEvents(completeLines)) {
        if (typeof event.turn_id !== "string" || !event.turn_id) continue;
        const key = createDispatchKey({
          sessionId: options.sessionId,
          turnId: event.turn_id,
        });
        if (seen.has(key)) continue;
        seen.add(key);
        classifyCompletion(event.last_agent_message);
      }
    } else {
      remainder = combined;
    }

    if (!options.watch) return;
    await delay(options.pollMs);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  try {
    await run(options);
  } finally {
    if (options.lockFile) await unlink(options.lockFile).catch(() => {});
  }
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  await main().catch(() => {
    process.exitCode = 1;
  });
}
