import { access, cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { constants as fsConstants } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const appName = "Nuvio TV";

// We use the LOCAL nuvio.env.js as the source of truth for the self-hosted ecosystem
const defaultEnvFileContents = `(function bootstrapTizenEnv() {
  var root = typeof globalThis !== "undefined" ? globalThis : window;
  root.__NUVIO_ENV__ = {
    SUPABASE_URL: "https://shznduulclxqundfztxv.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoem5kdXVsY2x4cXVuZGZ6dHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NTU5ODgxOTcsImV4cCI6MTk3MTU2NDE5N30.R_XW7kS_XW7kS_XW7kS_XW7kS_XW7kS_XW7kS_XW7kS",
    TV_LOGIN_REDIRECT_BASE_URL: "https://nuvioapp.space/tv-login",
    YOUTUBE_PROXY_URL: "youtube-proxy.html",
    ADDON_REMOTE_BASE_URL: "",
    ENABLE_REMOTE_WRAPPER_MODE: false,
    PREFERRED_PLAYBACK_ORDER: ["native-hls", "hls.js", "dash.js", "native-file", "platform-avplay"],
    TMDB_API_KEY: ""
  };

  if (typeof root.__NUVIO_TIZEN_BOOTSTRAP_APP__ === "function") {
    root.__NUVIO_TIZEN_BOOTSTRAP_APP__();
  }
}());
`;

const tizenIconSource = path.join(rootDir, "assets", "images", "tizenIcon.png");

function fail(message) {
  throw new Error(`${message}\n\nUsage: node ./scripts/sync-tizenbrew.mjs --path /absolute/path/to/module`);
}

function parseArgs(argv) {
  let targetPath = "";
  let envSourcePath = "";
  const positionalArgs = [];
  const npmConfigPath = process.env.npm_config_path;
  const npmProvidedPath = npmConfigPath && npmConfigPath !== "true" ? npmConfigPath : "";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--path") {
      targetPath = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--env-source") {
      envSourcePath = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (!arg.startsWith("--")) {
      positionalArgs.push(arg);
      continue;
    }
    fail(`Unknown argument: ${arg}`);
  }

  if (!targetPath) targetPath = positionalArgs[0] || npmProvidedPath || "";
  if (!targetPath) fail("Missing --path.");
  if (!path.isAbsolute(targetPath)) fail(`Target path must be absolute: ${targetPath}`);

  return { targetDir: targetPath, envSourcePath };
}

async function assertDistExists() {
  try {
    await access(distDir, fsConstants.R_OK);
  } catch {
    throw new Error(`Build output not found at ${distDir}. Run \"npm run build\" first.`);
  }
}

async function syncFolder(targetDir, folderName) {
  await rm(path.join(targetDir, folderName), { recursive: true, force: true });
  await cp(path.join(distDir, folderName), path.join(targetDir, folderName), { recursive: true });
}

async function syncBuild(targetAppDir, envSourcePath) {
  await mkdir(targetAppDir, { recursive: true });
  await Promise.all([
    syncFolder(targetAppDir, "assets"),
    syncFolder(targetAppDir, "css"),
    syncFolder(targetAppDir, "js"),
    syncFolder(targetAppDir, "res")
  ]);

  await cp(path.join(distDir, "app.bundle.js"), path.join(targetAppDir, "app.bundle.js"));
  await writeFile(path.join(targetAppDir, "nuvio.env.js"), defaultEnvFileContents, "utf8");
}

function buildIndexHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${appName}</title>
  <link rel="stylesheet" href="css/base.css" />
  <link rel="stylesheet" href="css/layout.css" />
  <link rel="stylesheet" href="css/components.css" />
  <link rel="stylesheet" href="css/themes.css" />
</head>
<body>
  <script defer src="main.js"></script>
</body>
</html>
`;
}

function buildMainJs() {
  return `window.__NUVIO_PLATFORM__ = "tizen";

var tvInput = window.tizen && window.tizen.tvinputdevice;
if (tvInput && typeof tvInput.registerKey === "function") {
  ["MediaPlay", "MediaPause", "MediaPlayPause", "MediaFastForward", "MediaRewind"].forEach(function registerKey(keyName) {
    try {
      tvInput.registerKey(keyName);
    } catch (_) {}
  });
}

function loadScript(src) {
  var script = document.createElement("script");
  script.src = src;
  script.defer = false;
  document.body.appendChild(script);
}

window.__NUVIO_TIZEN_BOOTSTRAP_APP__ = function bootstrapApp() {
  if (window.__NUVIO_TIZEN_APP_BOOTSTRAPPED__) return;
  window.__NUVIO_TIZEN_APP_BOOTSTRAPPED__ = true;
  loadScript("assets/libs/qrcode-generator.js");
  loadScript("app.bundle.js");
};

loadScript("nuvio.env.js");
`;
}

async function syncModule(targetDir, envSourcePath) {
  const appDir = path.join(targetDir, "app");
  await mkdir(targetDir, { recursive: true });
  await syncBuild(appDir, envSourcePath);
  await cp(tizenIconSource, path.join(targetDir, "icon.png")).catch(() => {});
  await writeFile(path.join(appDir, "index.html"), buildIndexHtml(), "utf8");
  await writeFile(path.join(appDir, "main.js"), buildMainJs(), "utf8");
}

const { targetDir, envSourcePath } = parseArgs(process.argv.slice(2));
await assertDistExists();
await syncModule(targetDir, envSourcePath);

console.log(`Synced TizenBrew module assets to ${targetDir}`);
