import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import {
  SourceControlProviderError,
  type ChangeRequest,
  type ChangeRequestState,
} from "@t3tools/contracts";
import { parseGitHubRepositoryNameWithOwnerFromRemoteUrl } from "@t3tools/shared/git";

import * as GitHubCli from "./GitHubCli.ts";
import * as GitHubPullRequests from "./gitHubPullRequests.ts";
import * as SourceControlProvider from "./SourceControlProvider.ts";
import * as SourceControlProviderDiscovery from "./SourceControlProviderDiscovery.ts";
const isGitHubCliError = Schema.is(GitHubCli.GitHubCliError);
const isSourceControlProviderError = Schema.is(SourceControlProviderError);

function providerError(
  operation: string,
  cause: GitHubCli.GitHubCliError,
): SourceControlProviderError {
  return new SourceControlProviderError({
    provider: "github",
    operation,
    detail: cause.detail,
    cause,
  });
}

function toChangeRequest(summary: GitHubCli.GitHubPullRequestSummary): ChangeRequest {
  return {
    provider: "github",
    number: summary.number,
    title: summary.title,
    url: summary.url,
    baseRefName: summary.baseRefName,
    headRefName: summary.headRefName,
    state: summary.state ?? "open",
    updatedAt: Option.none(),
    ...(summary.isCrossRepository !== undefined
      ? { isCrossRepository: summary.isCrossRepository }
      : {}),
    ...(summary.headRepositoryNameWithOwner !== undefined
      ? { headRepositoryNameWithOwner: summary.headRepositoryNameWithOwner }
      : {}),
    ...(summary.headRepositoryOwnerLogin !== undefined
      ? { headRepositoryOwnerLogin: summary.headRepositoryOwnerLogin }
      : {}),
  };
}

function repositoryFromContext(
  context: SourceControlProvider.SourceControlProviderContext | undefined,
): string | null {
  return context ? parseGitHubRepositoryNameWithOwnerFromRemoteUrl(context.remoteUrl) : null;
}

function listOpenPullRequestsWithContextFallback(input: {
  readonly github: GitHubCli.GitHubCliShape;
  readonly cwd: string;
  readonly repository: string | null;
  readonly headSelector: string;
  readonly limit?: number;
}) {
  const listDefaultRepository = () =>
    input.github.listOpenPullRequests({
      cwd: input.cwd,
      headSelector: input.headSelector,
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    });

  if (!input.repository) {
    return listDefaultRepository();
  }

  return input.github
    .listOpenPullRequests({
      cwd: input.cwd,
      repository: input.repository,
      headSelector: input.headSelector,
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    })
    .pipe(
      Effect.catchIf(isGitHubCliError, () =>
        Effect.succeed([] as ReadonlyArray<GitHubCli.GitHubPullRequestSummary>),
      ),
      Effect.flatMap((items) =>
        items.length > 0 ? Effect.succeed(items) : listDefaultRepository(),
      ),
    );
}

function decodePullRequestListOutput(raw: string) {
  if (raw.length === 0) {
    return Effect.succeed([]);
  }
  return Effect.sync(() => GitHubPullRequests.decodeGitHubPullRequestListJson(raw)).pipe(
    Effect.flatMap((decoded) =>
      Result.isSuccess(decoded)
        ? Effect.succeed(
            decoded.success.map((item) => ({
              ...toChangeRequest(item),
              updatedAt: item.updatedAt,
            })),
          )
        : Effect.fail(
            new SourceControlProviderError({
              provider: "github",
              operation: "listChangeRequests",
              detail: "GitHub CLI returned invalid change request JSON.",
              cause: decoded.failure,
            }),
          ),
    ),
  );
}

function listNonOpenPullRequestsWithContextFallback(input: {
  readonly github: GitHubCli.GitHubCliShape;
  readonly cwd: string;
  readonly repository: string | null;
  readonly headSelector: string;
  readonly state: ChangeRequestState | "all";
  readonly limit?: number;
}) {
  const jsonFields =
    "number,title,url,baseRefName,headRefName,state,mergedAt,updatedAt,isCrossRepository,headRepository,headRepositoryOwner";
  const executeList = (repository: string | null) =>
    input.github
      .execute({
        cwd: input.cwd,
        args: [
          "pr",
          "list",
          ...(repository ? ["--repo", repository] : []),
          "--head",
          input.headSelector,
          "--state",
          input.state,
          "--limit",
          String(input.limit ?? 20),
          "--json",
          jsonFields,
        ],
      })
      .pipe(
        Effect.map((result) => result.stdout.trim()),
        Effect.flatMap(decodePullRequestListOutput),
      );

  if (!input.repository) {
    return executeList(null);
  }

  return executeList(input.repository).pipe(
    Effect.catchIf(isGitHubCliError, () => Effect.succeed([] as ReadonlyArray<ChangeRequest>)),
    Effect.flatMap((items) => (items.length > 0 ? Effect.succeed(items) : executeList(null))),
  );
}

function parseGitHubAuth(input: SourceControlProviderDiscovery.SourceControlAuthProbeInput) {
  const output = SourceControlProviderDiscovery.combinedAuthOutput(input);
  const account = SourceControlProviderDiscovery.matchFirst(output, [
    /Logged in to .* account\s+([^\s(]+)/iu,
    /Logged in to .* as\s+([^\s(]+)/iu,
  ]);
  const host = SourceControlProviderDiscovery.parseCliHost(output);

  if (input.exitCode !== 0) {
    return SourceControlProviderDiscovery.providerAuth({
      status: "unauthenticated",
      host,
      detail:
        SourceControlProviderDiscovery.firstSafeAuthLine(output) ??
        "Run `gh auth login` to authenticate GitHub CLI.",
    });
  }

  if (account) {
    return SourceControlProviderDiscovery.providerAuth({ status: "authenticated", account, host });
  }

  return SourceControlProviderDiscovery.providerAuth({
    status: "unknown",
    host,
    detail:
      SourceControlProviderDiscovery.firstSafeAuthLine(output) ??
      "GitHub CLI auth status could not be parsed.",
  });
}

export const discovery = {
  type: "cli",
  kind: "github",
  label: "GitHub",
  executable: "gh",
  versionArgs: ["--version"],
  authArgs: ["auth", "status"],
  parseAuth: parseGitHubAuth,
  installHint:
    "Install the GitHub command-line tool (`gh`) via https://cli.github.com/ or your package manager (for example `brew install gh`).",
} satisfies SourceControlProviderDiscovery.SourceControlCliDiscoverySpec;

export const make = Effect.fn("makeGitHubSourceControlProvider")(function* () {
  const github = yield* GitHubCli.GitHubCli;

  const listChangeRequests: SourceControlProvider.SourceControlProviderShape["listChangeRequests"] =
    (input) => {
      const repository = repositoryFromContext(input.context);
      if (input.state === "open") {
        return listOpenPullRequestsWithContextFallback({
          github,
          cwd: input.cwd,
          repository,
          headSelector: input.headSelector,
          ...(input.limit !== undefined ? { limit: input.limit } : {}),
        }).pipe(
          Effect.map((items) => items.map(toChangeRequest)),
          Effect.mapError((error) => providerError("listChangeRequests", error)),
        );
      }

      const stateArg: ChangeRequestState | "all" = input.state;
      return listNonOpenPullRequestsWithContextFallback({
        github,
        cwd: input.cwd,
        repository,
        headSelector: input.headSelector,
        state: stateArg,
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      }).pipe(
        Effect.mapError((error) =>
          isSourceControlProviderError(error) ? error : providerError("listChangeRequests", error),
        ),
      );
    };

  return SourceControlProvider.SourceControlProvider.of({
    kind: "github",
    listChangeRequests,
    getChangeRequest: (input) =>
      github.getPullRequest(input).pipe(
        Effect.map(toChangeRequest),
        Effect.mapError((error) => providerError("getChangeRequest", error)),
      ),
    createChangeRequest: (input) =>
      Effect.sync(() => repositoryFromContext(input.context)).pipe(
        Effect.flatMap((repository) =>
          github.createPullRequest({
            cwd: input.cwd,
            baseBranch: input.baseRefName,
            headSelector: input.headSelector,
            ...(repository ? { repository } : {}),
            title: input.title,
            bodyFile: input.bodyFile,
            ...(input.draft !== undefined ? { draft: input.draft } : {}),
          }),
        ),
        Effect.mapError((error) => providerError("createChangeRequest", error)),
      ),
    getRepositoryCloneUrls: (input) =>
      github
        .getRepositoryCloneUrls(input)
        .pipe(Effect.mapError((error) => providerError("getRepositoryCloneUrls", error))),
    createRepository: (input) =>
      github
        .createRepository(input)
        .pipe(Effect.mapError((error) => providerError("createRepository", error))),
    getDefaultBranch: (input) =>
      Effect.sync(() => repositoryFromContext(input.context)).pipe(
        Effect.flatMap((repository) =>
          github.getDefaultBranch({
            cwd: input.cwd,
            ...(repository ? { repository } : {}),
          }),
        ),
        Effect.mapError((error) => providerError("getDefaultBranch", error)),
      ),
    checkoutChangeRequest: (input) =>
      github
        .checkoutPullRequest(input)
        .pipe(Effect.mapError((error) => providerError("checkoutChangeRequest", error))),
  });
});

export const layer = Layer.effect(SourceControlProvider.SourceControlProvider, make());
