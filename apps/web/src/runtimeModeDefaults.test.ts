import { describe, expect, it } from "vitest";
import {
  FIRST_RUN_THREAD_RUNTIME_MODE,
  resolveDefaultThreadRuntimeMode,
  resolveUnsupportedRuntimeModeForProvider,
} from "./runtimeModeDefaults";

describe("runtime mode defaults", () => {
  it("uses auto-review for first-run follow-last defaults", () => {
    expect(
      resolveDefaultThreadRuntimeMode({
        preference: "follow-last",
        lastRuntimeMode: null,
      }),
    ).toBe(FIRST_RUN_THREAD_RUNTIME_MODE);
  });

  it("uses the last selected runtime mode for follow-last defaults", () => {
    expect(
      resolveDefaultThreadRuntimeMode({
        preference: "follow-last",
        lastRuntimeMode: "auto-accept-edits",
      }),
    ).toBe("auto-accept-edits");
  });

  it("lets explicit runtime mode preferences override the last selected mode", () => {
    expect(
      resolveDefaultThreadRuntimeMode({
        preference: "approval-required",
        lastRuntimeMode: "full-access",
      }),
    ).toBe("approval-required");
  });

  it("falls back to supervised mode when auto-review is not supported", () => {
    expect(
      resolveUnsupportedRuntimeModeForProvider({
        runtimeMode: "codex-auto-review",
        supportsCodexAutoReview: false,
      }),
    ).toBe("approval-required");
  });
});
