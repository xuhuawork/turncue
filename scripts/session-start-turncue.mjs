#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, open, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export function buildSessionStartHookResponse() {
  return {};
}

function safeSessionId(value) {
  return value.replace(/[^A-Za-z0-9._-]/g, "_");
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

async function readLock(lockFile) {
  try {
    return JSON.parse(await readFile(lockFile, "utf8"));
  } catch {
    return null;
  }
}

async function claimLock(lockFile) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(lockFile, "wx");
      await handle.writeFile(
        `${JSON.stringify({ pid: process.pid, status: "starting" })}\n`,
      );
      await handle.close();
      return true;
    } catch (error) {
      if (error?.code !== "EEXIST") return false;
      const current = await readLock(lockFile);
      if (isProcessAlive(current?.pid)) return false;
      await unlink(lockFile).catch(() => {});
    }
  }
  return false;
}

export async function ensureObserver(
  input,
  {
    env = process.env,
    spawnFn = spawn,
    nodePath = process.execPath,
    hostPid = process.ppid,
  } = {},
) {
  if (
    input?.hook_event_name !== "SessionStart" ||
    !["startup", "resume"].includes(input.source) ||
    typeof input.session_id !== "string" ||
    !input.session_id ||
    typeof input.transcript_path !== "string" ||
    !input.transcript_path ||
    typeof input.cwd !== "string" ||
    !input.cwd ||
    typeof env.PLUGIN_ROOT !== "string" ||
    !env.PLUGIN_ROOT ||
    typeof env.PLUGIN_DATA !== "string" ||
    !env.PLUGIN_DATA
  ) {
    return { status: "skipped" };
  }

  const watcherDirectory = path.join(env.PLUGIN_DATA, "watchers");
  const lockFile = path.join(
    watcherDirectory,
    `${safeSessionId(input.session_id)}.json`,
  );
  await mkdir(watcherDirectory, { recursive: true });
  if (!(await claimLock(lockFile))) {
    return { status: "already_running", lockFile };
  }

  const observerPath = path.join(
    env.PLUGIN_ROOT,
    "scripts",
    "turncue-observer.mjs",
  );
  const args = [
    observerPath,
    "--session",
    input.session_id,
    "--transcript",
    input.transcript_path,
    "--cwd",
    input.cwd,
    "--host",
    "codex_desktop",
    "--host-pid",
    String(hostPid),
    "--lock-file",
    lockFile,
    "--watch",
  ];

  try {
    const child = spawnFn(nodePath, args, {
      cwd: input.cwd,
      detached: true,
      env,
      stdio: "ignore",
    });
    if (!Number.isInteger(child.pid) || child.pid <= 0) {
      throw new Error("observer did not return a valid PID");
    }
    await writeFile(
      lockFile,
      `${JSON.stringify({
        pid: child.pid,
        hostPid,
        sessionId: input.session_id,
        status: "observer_only",
      })}\n`,
      "utf8",
    );
    child.unref();
    return { status: "started", pid: child.pid, lockFile };
  } catch {
    await unlink(lockFile).catch(() => {});
    return { status: "failed" };
  }
}

async function readStdin() {
  let value = "";
  for await (const chunk of process.stdin) value += chunk;
  return value;
}

async function main() {
  try {
    await ensureObserver(JSON.parse(await readStdin()));
  } catch {
    // Fail open with no stdout so the Hook cannot inject model context.
  }
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  await main();
}
