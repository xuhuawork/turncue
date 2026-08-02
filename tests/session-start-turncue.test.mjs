import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

import { buildSessionStartHookResponse } from "../scripts/session-start-turncue.mjs";

test("SessionStart observer never injects a continuation", () => {
  const input = {
    hook_event_name: "SessionStart",
    session_id: "session-123",
    transcript_path: "/tmp/transcript.jsonl",
    cwd: "/tmp/project",
    source: "startup",
  };

  assert.deepEqual(buildSessionStartHookResponse(input), {});
  const result = spawnSync(process.execPath, ["scripts/session-start-turncue.mjs"], {
    input: JSON.stringify(input),
    encoding: "utf8",
    env: {},
  });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
  assert.doesNotMatch(result.stdout, /decision|reason/);
});

test("incomplete SessionStart input remains fail-open", () => {
  assert.deepEqual(
    buildSessionStartHookResponse({ hook_event_name: "SessionStart" }),
    {},
  );
});
