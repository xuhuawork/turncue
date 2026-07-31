import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AUTO_NAVIGATION_REASON,
  buildStopHookResponse,
} from "../scripts/auto-navigation-stop-hook.mjs";

test("continues a completed answer with an automatic navigation turn", () => {
  const response = buildStopHookResponse({
    hook_event_name: "Stop",
    stop_hook_active: false,
    last_assistant_message: "正文已经完成。",
  });

  assert.equal(response.decision, "block");
  assert.equal(response.reason, AUTO_NAVIGATION_REASON);
  assert.match(response.reason, /show_next_steps/);
  assert.match(response.reason, /mode="update"/);
  assert.match(response.reason, /只调用/);
  assert.match(response.reason, /40–300 字/);
  assert.match(response.reason, /期望的交付物或验证结果/);
  assert.match(response.reason, /多轮 Agent 任务/);
  assert.match(response.reason, /navigationPreference/);
  assert.match(response.reason, /brainstorm\|rational\|empathic/);
  assert.match(response.reason, /optionCount/);
  assert.match(response.reason, /恰好等于 optionCount/);
});

test("does not recurse after the Stop hook has already continued the turn", () => {
  assert.deepEqual(
    buildStopHookResponse({
      hook_event_name: "Stop",
      stop_hook_active: true,
      last_assistant_message: "导航工具已经调用。",
    }),
    {},
  );
});

test("ignores non-Stop events and empty assistant messages", () => {
  assert.deepEqual(
    buildStopHookResponse({
      hook_event_name: "PostToolUse",
      stop_hook_active: false,
      last_assistant_message: "正文",
    }),
    {},
  );
  assert.deepEqual(
    buildStopHookResponse({
      hook_event_name: "Stop",
      stop_hook_active: false,
      last_assistant_message: " ",
    }),
    {},
  );
});
