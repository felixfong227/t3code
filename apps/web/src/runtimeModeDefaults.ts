import { type RuntimeMode } from "@t3tools/contracts";
import {
  DEFAULT_THREAD_RUNTIME_MODE_PREFERENCE,
  type DefaultThreadRuntimeModePreference,
} from "@t3tools/contracts/settings";

export const FIRST_RUN_THREAD_RUNTIME_MODE: RuntimeMode = "codex-auto-review";

export function resolveDefaultThreadRuntimeMode(input: {
  readonly preference: DefaultThreadRuntimeModePreference | null | undefined;
  readonly lastRuntimeMode: RuntimeMode | null | undefined;
}): RuntimeMode {
  const preference = input.preference ?? DEFAULT_THREAD_RUNTIME_MODE_PREFERENCE;
  if (preference !== "follow-last") {
    return preference;
  }
  return input.lastRuntimeMode ?? FIRST_RUN_THREAD_RUNTIME_MODE;
}

export function resolveUnsupportedRuntimeModeForProvider(input: {
  readonly runtimeMode: RuntimeMode;
  readonly supportsCodexAutoReview: boolean;
}): RuntimeMode {
  if (input.runtimeMode === "codex-auto-review" && !input.supportsCodexAutoReview) {
    return "approval-required";
  }
  return input.runtimeMode;
}
