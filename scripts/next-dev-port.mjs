#!/usr/bin/env node
/**
 * Next dev bir xil portda ishga tushadi (standart: 3001 — turbo bilan mos).
 * Port band bo'lsa, Linux/macOS da LISTEN jarayonini yumshoq to'xtatadi.
 */
import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

const rawPort = process.env.DEV_PORT || process.env.PORT || process.env.NEXT_PUBLIC_DEV_PORT || "3001";
const PORT = Math.max(1, Math.min(65535, parseInt(String(rawPort), 10) || 3001));
const useTurbo = process.argv.includes("--turbo");

if (useTurbo) {
  console.info(
    "[dev] Turbo: `npm run dev:turbo` avval `.next` ni tozalaydi. Baribir xato bo‘lsa `npm run dev` (webpack) ishlating.",
  );
}

function listenOnce(host, port) {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(port, host, () => {
      srv.close(() => resolve());
    });
  });
}

async function isPortAvailable(port) {
  try {
    await listenOnce("127.0.0.1", port);
    return true;
  } catch {
    return false;
  }
}

function tryFreePort(port) {
  if (process.platform !== "linux" && process.platform !== "darwin") {
    return;
  }
  try {
    execFileSync("fuser", ["-k", `${port}/tcp`], { stdio: "ignore", cwd: root });
    console.info(`[dev] ${port}/tcp band edi — jarayon to'xtatildi, qayta ${port} ishlatiladi.`);
  } catch {
    // fuser yo'q yoki jarayon yo'q
  }
}

async function ensurePort(port) {
  if (await isPortAvailable(port)) {
    return;
  }
  tryFreePort(port);
  await new Promise((r) => setTimeout(r, 400));
  if (await isPortAvailable(port)) {
    return;
  }
  console.warn(`[dev] Ogohlantirish: ${port} hali ham band — Next boshqa port tanlashi mumkin. fuser/lsof tekshiring.`);
}

await ensurePort(PORT);

console.info(
  "[dev] Eslatma: `npm run dev` ishlaganda boshqa terminalda `npm run build` ishga tushirmang — `.next` aralashib, `Cannot find module './vendor-chunks/...'` xatolari chiqadi. Chunk xato bo‘lsa: dev ni to‘xtating (`Ctrl+C`), keyin `npm run dev:clean`.",
);

const nextArgs = ["dev", "-p", String(PORT), ...(useTurbo ? ["--turbo"] : [])];
const child = spawn(process.execPath, [nextBin, ...nextArgs], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PORT: String(PORT) },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 0);
});
