import { assert, it } from "@effect/vitest";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { ChildProcessSpawner } from "effect/unstable/process";

import * as VcsProcess from "../vcs/VcsProcess.ts";
import * as GitHubCli from "./GitHubCli.ts";
import * as GitHubSourceControlProvider from "./GitHubSourceControlProvider.ts";

const processResult = (stdout: string): VcsProcess.VcsProcessOutput => ({
  exitCode: ChildProcessSpawner.ExitCode(0),
  stdout,
  stderr: "",
  stdoutTruncated: false,
  stderrTruncated: false,
});

const githubCliError = new GitHubCli.GitHubCliError({
  operation: "execute",
  detail: "failed",
});

function makeProvider(github: Partial<GitHubCli.GitHubCliShape>) {
  return GitHubSourceControlProvider.make().pipe(
    Effect.provide(Layer.mock(GitHubCli.GitHubCli)(github)),
  );
}

it.effect("maps GitHub PR summaries into provider-neutral change requests", () =>
  Effect.gen(function* () {
    const provider = yield* makeProvider({
      getPullRequest: () =>
        Effect.succeed({
          number: 42,
          title: "Add GitHub provider",
          url: "https://github.com/pingdotgg/t3code/pull/42",
          baseRefName: "main",
          headRefName: "feature/source-control",
          state: "open",
          isCrossRepository: true,
          headRepositoryNameWithOwner: "fork/t3code",
          headRepositoryOwnerLogin: "fork",
        }),
    });

    const changeRequest = yield* provider.getChangeRequest({
      cwd: "/repo",
      reference: "42",
    });

    assert.deepStrictEqual(changeRequest, {
      provider: "github",
      number: 42,
      title: "Add GitHub provider",
      url: "https://github.com/pingdotgg/t3code/pull/42",
      baseRefName: "main",
      headRefName: "feature/source-control",
      state: "open",
      updatedAt: Option.none(),
      isCrossRepository: true,
      headRepositoryNameWithOwner: "fork/t3code",
      headRepositoryOwnerLogin: "fork",
    });
  }),
);

it.effect("uses gh json listing for non-open change request state queries", () =>
  Effect.gen(function* () {
    let executeArgs: ReadonlyArray<string> = [];
    const provider = yield* makeProvider({
      execute: (input) => {
        executeArgs = input.args;
        return Effect.succeed(
          processResult(
            JSON.stringify([
              {
                number: 7,
                title: "Merged work",
                url: "https://github.com/pingdotgg/t3code/pull/7",
                baseRefName: "main",
                headRefName: "feature/merged",
                state: "merged",
                updatedAt: "2026-01-02T00:00:00.000Z",
              },
            ]),
          ),
        );
      },
    });

    const changeRequests = yield* provider.listChangeRequests({
      cwd: "/repo",
      headSelector: "feature/merged",
      state: "all",
      limit: 10,
    });

    assert.deepStrictEqual(executeArgs, [
      "pr",
      "list",
      "--head",
      "feature/merged",
      "--state",
      "all",
      "--limit",
      "10",
      "--json",
      "number,title,url,baseRefName,headRefName,state,mergedAt,updatedAt,isCrossRepository,headRepository,headRepositoryOwner",
    ]);
    assert.strictEqual(changeRequests[0]?.provider, "github");
    assert.strictEqual(changeRequests[0]?.state, "merged");
    assert.deepStrictEqual(
      changeRequests[0]?.updatedAt,
      Option.some(DateTime.makeUnsafe("2026-01-02T00:00:00.000Z")),
    );
  }),
);

it.effect("uses the resolved remote context repository for non-open GitHub PR listing", () =>
  Effect.gen(function* () {
    const executeInputs: Parameters<GitHubCli.GitHubCliShape["execute"]>[0][] = [];
    const provider = yield* makeProvider({
      execute: (input) => {
        executeInputs.push(input);
        return Effect.succeed(
          processResult(
            JSON.stringify([
              {
                number: 6,
                title: "Fork PR",
                url: "https://github.com/felixfong227/t3code/pull/6",
                baseRefName: "main",
                headRefName: "feature/thread-change-request-numbers",
                state: "OPEN",
                updatedAt: "2026-05-18T00:00:00.000Z",
              },
            ]),
          ),
        );
      },
    });

    const changeRequests = yield* provider.listChangeRequests({
      cwd: "/repo",
      context: {
        provider: { kind: "github", name: "GitHub", baseUrl: "https://github.com" },
        remoteName: "origin",
        remoteUrl: "git@github.com:felixfong227/t3code.git",
      },
      headSelector: "feature/thread-change-request-numbers",
      state: "all",
      limit: 20,
    });

    assert.deepStrictEqual(executeInputs[0]?.args.slice(0, 5), [
      "pr",
      "list",
      "--repo",
      "felixfong227/t3code",
      "--head",
    ]);
    assert.strictEqual(changeRequests[0]?.number, 6);
  }),
);

it.effect("lists GitHub PRs from the resolved remote context repository first", () =>
  Effect.gen(function* () {
    const listInputs: Parameters<GitHubCli.GitHubCliShape["listOpenPullRequests"]>[0][] = [];
    const provider = yield* makeProvider({
      listOpenPullRequests: (input) => {
        listInputs.push(input);
        return Effect.succeed([
          {
            number: 6,
            title: "Fork PR",
            url: "https://github.com/felixfong227/t3code/pull/6",
            baseRefName: "main",
            headRefName: "feature/thread-change-request-numbers",
            state: "open",
          },
        ]);
      },
    });

    const changeRequests = yield* provider.listChangeRequests({
      cwd: "/repo",
      context: {
        provider: { kind: "github", name: "GitHub", baseUrl: "https://github.com" },
        remoteName: "origin",
        remoteUrl: "git@github.com:felixfong227/t3code.git",
      },
      headSelector: "feature/thread-change-request-numbers",
      state: "open",
      limit: 1,
    });

    assert.deepStrictEqual(listInputs, [
      {
        cwd: "/repo",
        repository: "felixfong227/t3code",
        headSelector: "feature/thread-change-request-numbers",
        limit: 1,
      },
    ]);
    assert.strictEqual(changeRequests[0]?.number, 6);
  }),
);

it.effect("falls back to the default GitHub repository when context listing is empty", () =>
  Effect.gen(function* () {
    const listInputs: Parameters<GitHubCli.GitHubCliShape["listOpenPullRequests"]>[0][] = [];
    const provider = yield* makeProvider({
      listOpenPullRequests: (input) => {
        listInputs.push(input);
        if (input.repository) {
          return Effect.succeed([]);
        }
        return Effect.succeed([
          {
            number: 1003,
            title: "Upstream PR",
            url: "https://github.com/pingdotgg/t3code/pull/1003",
            baseRefName: "main",
            headRefName: "feature/upstream",
            state: "open",
          },
        ]);
      },
    });

    const changeRequests = yield* provider.listChangeRequests({
      cwd: "/repo",
      context: {
        provider: { kind: "github", name: "GitHub", baseUrl: "https://github.com" },
        remoteName: "origin",
        remoteUrl: "git@github.com:felixfong227/t3code.git",
      },
      headSelector: "feature/upstream",
      state: "open",
      limit: 1,
    });

    assert.deepStrictEqual(listInputs, [
      {
        cwd: "/repo",
        repository: "felixfong227/t3code",
        headSelector: "feature/upstream",
        limit: 1,
      },
      {
        cwd: "/repo",
        headSelector: "feature/upstream",
        limit: 1,
      },
    ]);
    assert.strictEqual(changeRequests[0]?.number, 1003);
  }),
);

it.effect("falls back to the default GitHub repository once when context listing errors", () =>
  Effect.gen(function* () {
    const listInputs: Parameters<GitHubCli.GitHubCliShape["listOpenPullRequests"]>[0][] = [];
    const provider = yield* makeProvider({
      listOpenPullRequests: (input) => {
        listInputs.push(input);
        if (input.repository) {
          return Effect.fail(githubCliError);
        }
        return Effect.succeed([]);
      },
    });

    const changeRequests = yield* provider.listChangeRequests({
      cwd: "/repo",
      context: {
        provider: { kind: "github", name: "GitHub", baseUrl: "https://github.com" },
        remoteName: "origin",
        remoteUrl: "git@github.com:felixfong227/t3code.git",
      },
      headSelector: "feature/missing",
      state: "open",
      limit: 1,
    });

    assert.deepStrictEqual(changeRequests, []);
    assert.deepStrictEqual(listInputs, [
      {
        cwd: "/repo",
        repository: "felixfong227/t3code",
        headSelector: "feature/missing",
        limit: 1,
      },
      {
        cwd: "/repo",
        headSelector: "feature/missing",
        limit: 1,
      },
    ]);
  }),
);

it.effect("treats empty non-open change request listing output as no results", () =>
  Effect.gen(function* () {
    const provider = yield* makeProvider({
      execute: () => Effect.succeed(processResult("")),
    });

    const changeRequests = yield* provider.listChangeRequests({
      cwd: "/repo",
      headSelector: "feature/empty",
      state: "all",
      limit: 10,
    });

    assert.deepStrictEqual(changeRequests, []);
  }),
);

it.effect("falls back to default non-open GitHub PR listing once when context listing errors", () =>
  Effect.gen(function* () {
    const executeInputs: Parameters<GitHubCli.GitHubCliShape["execute"]>[0][] = [];
    const provider = yield* makeProvider({
      execute: (input) => {
        executeInputs.push(input);
        if (input.args.includes("--repo")) {
          return Effect.fail(githubCliError);
        }
        return Effect.succeed(processResult(""));
      },
    });

    const changeRequests = yield* provider.listChangeRequests({
      cwd: "/repo",
      context: {
        provider: { kind: "github", name: "GitHub", baseUrl: "https://github.com" },
        remoteName: "origin",
        remoteUrl: "git@github.com:felixfong227/t3code.git",
      },
      headSelector: "feature/missing",
      state: "all",
      limit: 10,
    });

    assert.deepStrictEqual(changeRequests, []);
    assert.strictEqual(executeInputs.length, 2);
    assert.deepStrictEqual(executeInputs[0]?.args.slice(0, 5), [
      "pr",
      "list",
      "--repo",
      "felixfong227/t3code",
      "--head",
    ]);
    assert.deepStrictEqual(executeInputs[1]?.args.slice(0, 4), [
      "pr",
      "list",
      "--head",
      "feature/missing",
    ]);
  }),
);

it.effect("does not fall back when context non-open listing returns invalid JSON", () =>
  Effect.gen(function* () {
    const executeInputs: Parameters<GitHubCli.GitHubCliShape["execute"]>[0][] = [];
    const provider = yield* makeProvider({
      execute: (input) => {
        executeInputs.push(input);
        return Effect.succeed(processResult("{"));
      },
    });

    const result = yield* provider
      .listChangeRequests({
        cwd: "/repo",
        context: {
          provider: { kind: "github", name: "GitHub", baseUrl: "https://github.com" },
          remoteName: "origin",
          remoteUrl: "git@github.com:felixfong227/t3code.git",
        },
        headSelector: "feature/bad-json",
        state: "all",
        limit: 10,
      })
      .pipe(Effect.exit);

    assert.strictEqual(result._tag, "Failure");
    assert.strictEqual(executeInputs.length, 1);
    assert.deepStrictEqual(executeInputs[0]?.args.slice(0, 5), [
      "pr",
      "list",
      "--repo",
      "felixfong227/t3code",
      "--head",
    ]);
  }),
);

it.effect("creates GitHub PRs through provider-neutral input names", () =>
  Effect.gen(function* () {
    let createInput: Parameters<GitHubCli.GitHubCliShape["createPullRequest"]>[0] | null = null;
    const provider = yield* makeProvider({
      createPullRequest: (input) => {
        createInput = input;
        return Effect.void;
      },
    });

    yield* provider.createChangeRequest({
      cwd: "/repo",
      baseRefName: "main",
      headSelector: "owner:feature/provider",
      title: "Provider PR",
      bodyFile: "/tmp/body.md",
    });

    assert.deepStrictEqual(createInput, {
      cwd: "/repo",
      baseBranch: "main",
      headSelector: "owner:feature/provider",
      title: "Provider PR",
      bodyFile: "/tmp/body.md",
    });
  }),
);
