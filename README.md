# T3 Code Fork

This repository is a fork of upstream [T3 Code](https://github.com/pingdotgg/t3code).

The purpose of this fork is to add and maintain the features I want on top of upstream T3 Code. Upstream remains the base project, and this fork will track upstream versions while adding fork-controlled releases.

## Fork Features

Fork-specific implementations are not intended to compete with upstream forever. If upstream T3 Code adds the same feature, or a similar-enough implementation that solves the same problem, this fork should prefer the upstream version and remove the fork-specific implementation.

- Draft diff context comments for turn diffs ([#1](https://github.com/felixfong227/t3code/pull/1)) (Tracking [#79](https://github.com/pingdotgg/t3code/issues/79) and [#1003](https://github.com/pingdotgg/t3code/pull/1003)).
- Collapsible sidebar toggle with keyboard shortcut support ([#1](https://github.com/felixfong227/t3code/pull/1)) (Tracking [#2282](https://github.com/pingdotgg/t3code/issues/2282) and [#2011](https://github.com/pingdotgg/t3code/pull/2011)).
- Mermaid diagram rendering in chat markdown ([#2](https://github.com/felixfong227/t3code/pull/2)) (Tracking [#2250](https://github.com/pingdotgg/t3code/issues/2250)).
- Fork-aware PR/MR target selection ([#3](https://github.com/felixfong227/t3code/pull/3)).
- Automation style settings and PR target handling ([#4](https://github.com/felixfong227/t3code/pull/4)) (Tracking [#2123](https://github.com/pingdotgg/t3code/pull/2123)).
- Auto-review runtime mode for Codex sessions ([#5](https://github.com/felixfong227/t3code/pull/5)) (Tracking [#2384](https://github.com/pingdotgg/t3code/issues/2384)).
- Change request numbers surfaced in thread navigation ([#6](https://github.com/felixfong227/t3code/pull/6)).

## Versioning

Release versions in this fork use the current upstream version plus a semver-compatible date and revision suffix.

Format:

```text
v<upstream-semver>-<YYYYMMDD>.<revision>
```

Examples:

```text
v0.0.24-20260519.1
v0.0.24-20260519.2
v0.0.24-20260519.3
```

In these examples:

- `0.0.24` is the current upstream T3 Code version in `apps/desktop/package.json`.
- `20260519` is the fork release date.
- `1`, `2`, and `3` are fork-controlled revision numbers for that date.

The date and revision stay in the semver prerelease suffix because desktop auto-updates rely on semver comparison. Do not use five-segment versions like `0.0.24.20260519.1`.

## Development

```bash
bun install

T3_DEV_HOME="$(mktemp -d "$PWD/.t3-dev.XXXXXX")"

mkdir -p "$T3_DEV_HOME/dev"
rsync -a \
  --exclude 'attachments' \
  --exclude 'state.sqlite-shm' \
  --exclude 'state.sqlite-wal' \
  "$HOME/.t3/userdata/" "$T3_DEV_HOME/dev/"

T3CODE_HOME="$T3_DEV_HOME" bun run dev:desktop
```

## Building Artifacts

```bash
bun run dist:desktop:artifact
```
