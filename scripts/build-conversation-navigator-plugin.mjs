#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  cp,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
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
const pluginDocsImagesRoot = path.join(pluginRoot, "docs", "images");
const pluginLicensesRoot = path.join(pluginRoot, "licenses");
const runtimeLicensesRoot = path.join(pluginLicensesRoot, "runtime");
const bundledServerPath = path.join(pluginMcpRoot, "server.mjs");
const bundledServerMetafilePath = path.join(
  pluginMcpRoot,
  ".server-metafile.json",
);
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

await rm(pluginLicensesRoot, { recursive: true, force: true });
await cp(path.join(repositoryRoot, "licenses"), pluginLicensesRoot, {
  recursive: true,
});
await rm(pluginDocsImagesRoot, { recursive: true, force: true });
await cp(path.join(repositoryRoot, "docs", "images"), pluginDocsImagesRoot, {
  recursive: true,
});

await Promise.all([
  copyFile(
    path.join(repositoryRoot, "README.md"),
    path.join(pluginRoot, "README.md"),
  ),
  copyFile(
    path.join(repositoryRoot, "README.en.md"),
    path.join(pluginRoot, "README.en.md"),
  ),
  copyFile(
    path.join(repositoryRoot, "LICENSE"),
    path.join(pluginRoot, "LICENSE"),
  ),
  copyFile(
    path.join(repositoryRoot, "SECURITY.md"),
    path.join(pluginRoot, "SECURITY.md"),
  ),
  copyFile(
    path.join(repositoryRoot, "THIRD_PARTY_NOTICES.md"),
    path.join(pluginRoot, "THIRD_PARTY_NOTICES.md"),
  ),
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
    `--metafile=${bundledServerMetafilePath}`,
    `--outfile=${bundledServerPath}`,
  ],
  {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: "inherit",
  },
);

if (result.error) {
  await rm(bundledServerMetafilePath, { force: true });
  throw result.error;
}

if (result.status !== 0) {
  await rm(bundledServerMetafilePath, { force: true });
  process.exitCode = result.status ?? 1;
} else {
  const bundledSource = await readFile(bundledServerPath, "utf8");
  const normalizedSource = `${bundledSource.replace(/[ \t]+$/gm, "").trimEnd()}\n`;
  if (normalizedSource !== bundledSource) {
    await writeFile(bundledServerPath, normalizedSource, "utf8");
  }
  await writeRuntimeLicenses(bundledServerMetafilePath);
  await rm(bundledServerMetafilePath, { force: true });
  const { size } = await stat(bundledServerPath);
  process.stdout.write(
    `Built conversation-navigator plugin MCP (${Math.ceil(size / 1024)} KiB).\n`,
  );
}

async function writeRuntimeLicenses(metafilePath) {
  const metafile = JSON.parse(await readFile(metafilePath, "utf8"));
  const dependencies = await bundledDependencies(Object.keys(metafile.inputs));

  await mkdir(runtimeLicensesRoot, { recursive: true });
  const rows = [];

  for (const dependency of [...dependencies.values()].sort((left, right) =>
    `${left.name}@${left.version}`.localeCompare(
      `${right.name}@${right.version}`,
    ),
  )) {
    const entries = await readdir(dependency.path, { withFileTypes: true });
    const licenseEntries = entries
      .filter(
        (entry) =>
          entry.isFile() &&
          /^(license|licence|copying|notice)(\..*)?$/i.test(entry.name),
      )
      .sort((left, right) => left.name.localeCompare(right.name));

    if (licenseEntries.length === 0) {
      throw new Error(
        `No license file found for ${dependency.name}@${dependency.version}.`,
      );
    }

    const links = [];
    for (const entry of licenseEntries) {
      const outputName = `${safeFileName(dependency.name)}@${dependency.version}--${safeFileName(entry.name)}`;
      await copyFile(
        path.join(dependency.path, entry.name),
        path.join(runtimeLicensesRoot, outputName),
      );
      links.push(`[${entry.name}](./${outputName})`);
    }

    rows.push(
      `| \`${dependency.name}\` | ${dependency.version} | ${formatLicense(dependency.license)} | ${links.join(", ")} |`,
    );
  }

  const inventory = [
    "# Bundled runtime dependency licenses",
    "",
    "This inventory is generated from the dependencies included in the MCP bundle during `npm run build:plugin`.",
    "",
    "| Package | Version | License | License file |",
    "| --- | ---: | --- | --- |",
    ...rows,
    "",
  ].join("\n");

  await writeFile(
    path.join(runtimeLicensesRoot, "DEPENDENCIES.md"),
    inventory,
    "utf8",
  );
}

async function bundledDependencies(inputPaths) {
  const dependencies = new Map();
  const marker = "node_modules/";

  for (const inputPath of inputPaths) {
    const markerIndex = inputPath.lastIndexOf(marker);
    if (markerIndex === -1) {
      continue;
    }

    const dependencyPath = inputPath.slice(markerIndex + marker.length);
    const pathParts = dependencyPath.split("/");
    const packageParts = pathParts[0].startsWith("@")
      ? pathParts.slice(0, 2)
      : pathParts.slice(0, 1);
    const packageRelativeRoot = path.join(
      inputPath.slice(0, markerIndex + marker.length),
      ...packageParts,
    );
    const packageRoot = path.resolve(repositoryRoot, packageRelativeRoot);
    const packageJson = JSON.parse(
      await readFile(path.join(packageRoot, "package.json"), "utf8"),
    );

    dependencies.set(`${packageJson.name}@${packageJson.version}`, {
      name: packageJson.name,
      version: packageJson.version,
      license: packageJson.license,
      path: packageRoot,
    });
  }

  return dependencies;
}

function safeFileName(value) {
  return value
    .replace(/^@/, "")
    .replaceAll("/", "__")
    .replace(/[^A-Za-z0-9._@-]/g, "_");
}

function formatLicense(value) {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value.type === "string") {
    return value.type;
  }
  return "See license file";
}
