import { spawnSync } from "node:child_process";

const insideRepository = spawnSync(
  "git",
  ["rev-parse", "--is-inside-work-tree"],
  { stdio: "ignore" },
);

if (insideRepository.status === 0) {
  const configured = spawnSync(
    "git",
    ["config", "core.hooksPath", ".githooks"],
    { stdio: "inherit" },
  );

  if (configured.status !== 0) process.exitCode = configured.status ?? 1;
}
