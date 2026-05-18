import { describe, expect, it } from "vitest";

import {
  detectSourceControlProviderFromRemoteUrl,
  getChangeRequestTerminologyForKind,
  resolveChangeRequestPresentation,
} from "./sourceControl.ts";
import { parseRepositoryPathFromRemoteUrl } from "./git.ts";

describe("source control presentation", () => {
  it("uses merge request terminology for GitLab", () => {
    expect(getChangeRequestTerminologyForKind("gitlab")).toEqual({
      shortLabel: "MR",
      singular: "merge request",
    });
  });

  it("uses pull request terminology for GitHub-compatible providers", () => {
    expect(getChangeRequestTerminologyForKind("github")).toEqual({
      shortLabel: "PR",
      singular: "pull request",
    });
    expect(getChangeRequestTerminologyForKind("azure-devops")).toEqual({
      shortLabel: "PR",
      singular: "pull request",
    });
    expect(getChangeRequestTerminologyForKind("bitbucket")).toEqual({
      shortLabel: "PR",
      singular: "pull request",
    });
  });

  it("falls back to generic change request copy for unknown providers", () => {
    expect(
      resolveChangeRequestPresentation({ kind: "unknown", name: "forge", baseUrl: "" }),
    ).toEqual(
      expect.objectContaining({
        shortName: "change request",
        longName: "change request",
      }),
    );
  });
});

describe("detectSourceControlProviderFromRemoteUrl", () => {
  it("detects common source control hosts", () => {
    expect(detectSourceControlProviderFromRemoteUrl("git@github.com:owner/repo.git")?.kind).toBe(
      "github",
    );
    expect(
      detectSourceControlProviderFromRemoteUrl("https://gitlab.com/group/repo.git")?.kind,
    ).toBe("gitlab");
    expect(
      detectSourceControlProviderFromRemoteUrl("https://dev.azure.com/org/project/_git/repo")?.kind,
    ).toBe("azure-devops");
    expect(
      detectSourceControlProviderFromRemoteUrl("git@bitbucket.org:workspace/repo.git")?.kind,
    ).toBe("bitbucket");
  });
});

describe("parseRepositoryPathFromRemoteUrl", () => {
  it("parses GitLab project paths with nested groups", () => {
    expect(parseRepositoryPathFromRemoteUrl("git@gitlab.com:group/subgroup/t3code.git")).toBe(
      "group/subgroup/t3code",
    );
    expect(
      parseRepositoryPathFromRemoteUrl("https://gitlab.example.com/group/subgroup/t3code.git"),
    ).toBe("group/subgroup/t3code");
  });

  it("parses GitHub owner/repo remote URLs", () => {
    expect(parseRepositoryPathFromRemoteUrl("git@github.com:owner/t3code.git")).toBe(
      "owner/t3code",
    );
  });
});
