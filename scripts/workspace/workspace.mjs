import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runWorkspace } from "@alignfirst/workspace";

await runWorkspace({
  workspaceScript: fileURLToPath(import.meta.url),
  sharedDirs: [".local", ".plans"],
  runtimeDir: ".local-wt",
  gitignoredFiles: [],
  preSetup: ({ isMainWorktree, currentWorktree }) => {
    if (!isMainWorktree) return;
    execFileSync("npx", ["-y", "alignfirst", "plans", "check"], {
      cwd: currentWorktree,
      stdio: "inherit",
    });
  },
  finalizeWorkspace: ({ currentWorktree, progress }) => {
    progress("Installing dependencies");
    execFileSync("npm", ["install"], { cwd: currentWorktree, stdio: "inherit" });
    progress("Building the TypeOnly schema bundle");
    execFileSync("npm", ["run", "typeonly"], { cwd: currentWorktree, stdio: "inherit" });
    progress("Installing the Chromium of Playwright");
    execFileSync("npx", ["playwright", "install", "chromium"], {
      cwd: currentWorktree,
      stdio: "inherit",
    });
  },
  formatSummary: ({ currentWorktree }) => `Workspace ready: ${currentWorktree}`,
});
