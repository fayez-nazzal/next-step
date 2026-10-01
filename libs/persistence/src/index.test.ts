import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { createFileRepository } from "./index";

const directories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "next-step-persistence-"));
  directories.push(directory);
  return directory;
}

async function git(cwd: string, ...args: string[]): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const process = spawn("git", args, { cwd, stdio: "ignore" });
  process.once("error", reject);
  process.once("close", (code) =>
    code === 0 ? resolve() : reject(new Error(`git ${args.join(" ")} failed: ${code}`)),
  );
  return promise;
}

async function isGitIgnored(cwd: string, path: string): Promise<boolean> {
  const { promise, resolve, reject } = Promise.withResolvers<boolean>();
  const process = spawn("git", ["check-ignore", "--no-index", "-q", path], {
    cwd,
    stdio: "ignore",
  });
  process.once("error", reject);
  process.once("close", (code) =>
    code === 0
      ? resolve(true)
      : code === 1
        ? resolve(false)
        : reject(new Error(`git check-ignore failed: ${code}`)),
  );
  return promise;
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("file repository", () => {
  it("loads missing state without creating the state directory", async () => {
    const directory = await temporaryDirectory();
    expect(await createFileRepository(directory).load()).toEqual([]);
    await expect(readdir(join(directory, ".next-step"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("round-trips state and creates the directory only on save", async () => {
    const directory = await temporaryDirectory();
    const repository = createFileRepository(directory);
    const steps = [
      { id: "a", title: "A" },
      { id: "b", title: "B", description: "Details" },
    ] as const;
    await repository.save(steps);
    expect(await repository.load()).toEqual(steps);
    expect(await readdir(join(directory, ".next-step"))).toEqual(["state.yml"]);
  });

  it("uses unique atomic temporary files for concurrent saves", async () => {
    const directory = await temporaryDirectory();
    const repository = createFileRepository(directory);
    await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        repository.save([{ id: `id-${index}`, title: `Title ${index}` }]),
      ),
    );
    const loaded = await repository.load();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.id).toMatch(/^id-\d+$/);
    expect((await readdir(join(directory, ".next-step"))).sort()).toEqual(["state.yml"]);
  });

  it("adds one nested state exclusion and leaves .gitignore untouched", async () => {
    const directory = await temporaryDirectory();
    const nested = join(directory, "packages", "nested[1]");
    await mkdir(nested, { recursive: true });
    await git(directory, "init", "-q");
    await writeFile(join(directory, ".gitignore"), "keep-me\n");
    const repository = createFileRepository(nested);
    await repository.save([]);
    await repository.save([]);
    const excludePath = join(directory, ".git", "info", "exclude");
    const exclude = await readFile(excludePath, "utf8");
    expect(
      exclude
        .split(/\r?\n/)
        .filter((line) => line === "/packages/nested\\[1\\]/.next-step/state.yml"),
    ).toHaveLength(1);
    expect(await isGitIgnored(directory, "packages/nested[1]/.next-step/state.yml")).toBe(true);
    expect(await isGitIgnored(directory, "packages/nested1/.next-step/state.yml")).toBe(false);
    expect(await readFile(join(directory, ".gitignore"), "utf8")).toBe("keep-me\n");
  });

  it("finds the worktree exclude file when .git is a file", async () => {
    const directory = await temporaryDirectory();
    const worktree = join(directory, "worktree");
    await git(directory, "init", "-q");
    await git(directory, "config", "user.email", "test@example.com");
    await git(directory, "config", "user.name", "Test");
    await writeFile(join(directory, "tracked"), "x");
    await git(directory, "add", "tracked");
    await git(directory, "commit", "-qm", "initial");
    await git(directory, "worktree", "add", "-qb", "test-worktree", worktree);
    expect(await readFile(join(worktree, ".git"), "utf8")).toContain("gitdir:");
    await createFileRepository(worktree).save([]);
    const gitFile = await readFile(join(worktree, ".git"), "utf8");
    const metadataPath = join(directory, ".git", "worktrees", "worktree", "info", "exclude");
    expect(gitFile).toContain("gitdir:");
    expect(await readFile(metadataPath, "utf8")).toContain("/.next-step/state.yml");
  });
});
