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
  assert.match(response.reason, /Call only/);
  assert.match(response.reason, /40–300 characters/);
  assert.match(response.reason, /expected deliverable or verification result/);
  assert.match(response.reason, /multi-turn Agent work/);
  assert.match(response.reason, /navigationPreference/);
  assert.match(response.reason, /brainstorm\|rational\|empathic/);
  assert.match(response.reason, /optionCount/);
  assert.match(response.reason, /language/);
  assert.match(response.reason, /auto\|zh-CN\|en-US/);
  assert.match(response.reason, /auto follows the primary language/);
  assert.match(response.reason, /zh-CN forces/);
  assert.match(response.reason, /en-US forces/);
  assert.match(response.reason, /exactly optionCount items/);
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
