import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve, relative, dirname } from "node:path";
import { spawn } from "node:child_process";
import type { Queue } from "@next-step/domain";
import type { StepRepository } from "@next-step/application";
import { decodeQueue, encodeQueue } from "./codec";

const STATE_DIRECTORY = ".next-step";
const STATE_FILE = "state.yml";

function runGit(cwd: string, args: string[]): Promise<string | undefined> {
  const { promise, resolve } = Promise.withResolvers<string | undefined>();
  const child = spawn("git", args, { cwd, stdio: ["ignore", "pipe", "ignore"] });
  let output = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    output += chunk;
  });
  child.on("error", () => resolve(undefined));
  child.on("close", (code) => resolve(code === 0 ? output.trim() : undefined));
  return promise;
}

function gitPathPattern(path: string): string {
  return path
    .replaceAll("\\", "\\\\")
    .replaceAll("*", "\\*")
    .replaceAll("?", "\\?")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]");
}

async function ensureExcluded(directory: string, stateFile: string): Promise<void> {
  const worktree = await runGit(directory, ["rev-parse", "--show-toplevel"]);
  if (!worktree) return;
  const gitDirectory = await runGit(worktree, ["rev-parse", "--git-dir"]);
  if (!gitDirectory) return;
  const excludeFile = resolve(worktree, gitDirectory, "info", "exclude");
  const relativeStatePath = relative(worktree, stateFile).split("\\").join("/");
  const pattern = `/${gitPathPattern(relativeStatePath)}`;
  let existing = "";
  try {
    existing = await readFile(excludeFile, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (existing.split(/\r?\n/).includes(pattern)) return;
  await mkdir(dirname(excludeFile), { recursive: true });
  await writeFile(
    excludeFile,
    `${existing}${existing && !existing.endsWith("\n") ? "\n" : ""}${pattern}\n`,
    "utf8",
  );
}

export function createFileRepository(directory: string): StepRepository {
  const root = resolve(directory);
  const stateDirectory = join(root, STATE_DIRECTORY);
  const stateFile = join(stateDirectory, STATE_FILE);

  return {
    async load(): Promise<Queue> {
      let contents: string;
      try {
        contents = await readFile(stateFile, "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw error;
      }
      return decodeQueue(contents);
    },
    async save(steps: Queue): Promise<void> {
      const contents = encodeQueue(steps);
      await mkdir(stateDirectory, { recursive: true });
      const temporaryFile = join(stateDirectory, `.state-${randomUUID()}.tmp`);
      try {
        await writeFile(temporaryFile, contents, { encoding: "utf8", flag: "wx" });
        await rename(temporaryFile, stateFile);
        await ensureExcluded(root, stateFile);
      } finally {
        await rm(temporaryFile, { force: true });
      }
    },
  };
}
