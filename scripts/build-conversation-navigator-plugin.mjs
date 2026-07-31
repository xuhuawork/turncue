#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const pluginRoot = path.join(
  repositoryRoot,
  "plugins",
  "conversation-navigator",
);
const pluginMcpRoot = path.join(pluginRoot, "mcp");
const pluginScriptsRoot = path.join(pluginRoot, "scripts");
const bundledServerPath = path.join(pluginMcpRoot, "server.mjs");
const esbuildPath = path.join(
  repositoryRoot,
  "node_modules",
  ".bin",
  "esbuild",
);

await Promise.all([
  mkdir(pluginMcpRoot, { recursive: true }),
  mkdir(pluginScriptsRoot, { recursive: true }),
]);

await Promise.all([
  copyFile(
    path.join(repositoryRoot, "mcp", "prompt-guide-widget.html"),
    path.join(pluginMcpRoot, "prompt-guide-widget.html"),
  ),
  copyFile(
    path.join(repositoryRoot, "scripts", "auto-navigation-stop-hook.mjs"),
    path.join(pluginScriptsRoot, "auto-navigation-stop-hook.mjs"),
  ),
]);

const result = spawnSync(
  esbuildPath,
  [
    path.join(repositoryRoot, "mcp", "local-server.mjs"),
    "--bundle",
    "--platform=node",
    "--format=esm",
    "--target=node22",
    "--minify",
    "--legal-comments=eof",
    `--outfile=${bundledServerPath}`,
  ],
  {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exitCode = result.status ?? 1;
} else {
  const bundledSource = await readFile(bundledServerPath, "utf8");
  const normalizedSource = `${bundledSource.replace(/[ \t]+$/gm, "").trimEnd()}\n`;
  if (normalizedSource !== bundledSource) {
    await writeFile(bundledServerPath, normalizedSource, "utf8");
  }
  const { size } = await stat(bundledServerPath);
  process.stdout.write(
    `Built conversation-navigator plugin MCP (${Math.ceil(size / 1024)} KiB).\n`,
  );
}
