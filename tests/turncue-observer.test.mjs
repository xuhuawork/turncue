import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyCompletion,
  createDispatchKey,
  parseTaskCompleteEvents,
  resolveAutomationMode,
} from "../scripts/turncue-observer.mjs";

test("observer keeps turn identity and deduplicates with a stable key", () => {
  const events = parseTaskCompleteEvents(
    [
      JSON.stringify({ type: "event_msg", payload: { type: "token_count" } }),
      JSON.stringify({
        type: "event_msg",
        payload: {
          type: "task_complete",
          turn_id: "turn-1",
          last_agent_message: "实现和测试已经完成。",
        },
      }),
    ].join("\n"),
  );

  assert.equal(events.length, 1);
  assert.equal(events[0].turn_id, "turn-1");
  assert.equal(
    createDispatchKey({ sessionId: "session-1", turnId: "turn-1" }),
    "session-1:turn-1",
  );
});

test("observer recognizes waiting replies without writing back", () => {
  assert.equal(
    classifyCompletion("请提供 API Key 或授权访问，我收到后继续处理。"),
    "waiting",
  );
  assert.equal(
    classifyCompletion("修改已完成，测试全部通过。"),
    "completed",
  );
});

test("Codex Desktop stays observer-only without a shared endpoint", () => {
  assert.equal(
    resolveAutomationMode({ host: "codex_desktop", sharedEndpoint: null }),
    "observer_only",
  );
  assert.equal(
    resolveAutomationMode({
      host: "codex_desktop",
      sharedEndpoint: "ws://127.0.0.1:4500",
    }),
    "observer_only",
  );
});
