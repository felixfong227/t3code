import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import * as GitLabCli from "./GitLabCli.ts";
import * as GitLabSourceControlProvider from "./GitLabSourceControlProvider.ts";

function makeProvider(gitlab: Partial<GitLabCli.GitLabCliShape>) {
  return GitLabSourceControlProvider.make().pipe(
    Effect.provide(Layer.mock(GitLabCli.GitLabCli)(gitlab)),
  );
}

it.effect("maps GitLab MR summaries into provider-neutral change requests", () =>
  Effect.gen(function* () {
    const provider = yield* makeProvider({
      getMergeRequest: () =>
        Effect.succeed({
          number: 42,
          title: "Add GitLab provider",
          url: "https://gitlab.com/pingdotgg/t3code/-/merge_requests/42",
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
      provider: "gitlab",
      number: 42,
      title: "Add GitLab provider",
      url: "https://gitlab.com/pingdotgg/t3code/-/merge_requests/42",
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

it.effect("lists GitLab MRs through provider-neutral input names", () =>
  Effect.gen(function* () {
    let listInput: Parameters<GitLabCli.GitLabCliShape["listMergeRequests"]>[0] | null = null;
    const provider = yield* makeProvider({
      listMergeRequests: (input) => {
        listInput = input;
        return Effect.succeed([]);
      },
    });

    yield* provider.listChangeRequests({
      cwd: "/repo",
      headSelector: "feature/provider",
      state: "all",
      limit: 10,
    });

    assert.deepStrictEqual(listInput, {
      cwd: "/repo",
      headSelector: "feature/provider",
      state: "all",
      limit: 10,
    });
  }),
);

it.effect("passes selected GitLab target repository context into MR listing", () =>
  Effect.gen(function* () {
    let listInput: Parameters<GitLabCli.GitLabCliShape["listMergeRequests"]>[0] | null = null;
    const provider = yield* makeProvider({
      listMergeRequests: (input) => {
        listInput = input;
        return Effect.succeed([]);
      },
    });

    yield* provider.listChangeRequests({
      cwd: "/repo",
      context: {
        provider: { kind: "gitlab", name: "GitLab", baseUrl: "https://gitlab.com" },
        remoteName: "upstream",
        remoteUrl: "git@gitlab.com:pingdotgg/platform/t3code.git",
      },
      headSelector: "feature/provider",
      state: "open",
    });

    assert.deepStrictEqual(listInput, {
      cwd: "/repo",
      repository: "pingdotgg/platform/t3code",
      headSelector: "feature/provider",
      state: "open",
    });
  }),
);

it.effect("creates GitLab MRs through provider-neutral input names", () =>
  Effect.gen(function* () {
    let createInput: Parameters<GitLabCli.GitLabCliShape["createMergeRequest"]>[0] | null = null;
    const provider = yield* makeProvider({
      createMergeRequest: (input) => {
        createInput = input;
        return Effect.void;
      },
    });

    yield* provider.createChangeRequest({
      cwd: "/repo",
      baseRefName: "main",
      headSelector: "owner:feature/provider",
      title: "Provider MR",
      bodyFile: "/tmp/body.md",
    });

    assert.deepStrictEqual(createInput, {
      cwd: "/repo",
      baseBranch: "main",
      headSelector: "owner:feature/provider",
      source: {
        owner: "owner",
        refName: "feature/provider",
      },
      title: "Provider MR",
      bodyFile: "/tmp/body.md",
    });
  }),
);

it.effect("passes selected GitLab target repository context into MR creation", () =>
  Effect.gen(function* () {
    let createInput: Parameters<GitLabCli.GitLabCliShape["createMergeRequest"]>[0] | null = null;
    const provider = yield* makeProvider({
      createMergeRequest: (input) => {
        createInput = input;
        return Effect.void;
      },
    });

    yield* provider.createChangeRequest({
      cwd: "/repo",
      context: {
        provider: { kind: "gitlab", name: "GitLab", baseUrl: "https://gitlab.com" },
        remoteName: "upstream",
        remoteUrl: "git@gitlab.com:pingdotgg/platform/t3code.git",
      },
      source: {
        refName: "feature/provider",
        repository: "forks/felix/t3code",
        owner: "forks",
      },
      baseRefName: "main",
      headSelector: "forks:feature/provider",
      title: "Provider MR",
      bodyFile: "/tmp/body.md",
    });

    assert.deepStrictEqual(createInput, {
      cwd: "/repo",
      repository: "pingdotgg/platform/t3code",
      baseBranch: "main",
      headSelector: "forks:feature/provider",
      source: {
        refName: "feature/provider",
        repository: "forks/felix/t3code",
        owner: "forks",
      },
      title: "Provider MR",
      bodyFile: "/tmp/body.md",
    });
  }),
);

it.effect("passes selected GitLab target repository context into default branch lookup", () =>
  Effect.gen(function* () {
    let defaultBranchInput: Parameters<GitLabCli.GitLabCliShape["getDefaultBranch"]>[0] | null =
      null;
    const provider = yield* makeProvider({
      getDefaultBranch: (input) => {
        defaultBranchInput = input;
        return Effect.succeed("main");
      },
    });

    yield* provider.getDefaultBranch({
      cwd: "/repo",
      context: {
        provider: { kind: "gitlab", name: "GitLab", baseUrl: "https://gitlab.com" },
        remoteName: "upstream",
        remoteUrl: "https://gitlab.com/pingdotgg/platform/t3code.git",
      },
    });

    assert.deepStrictEqual(defaultBranchInput, {
      cwd: "/repo",
      repository: "pingdotgg/platform/t3code",
    });
  }),
);
