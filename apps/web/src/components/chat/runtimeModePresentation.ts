import type { ProviderDriverKind, RuntimeMode } from "@t3tools/contracts";
import {
  type LucideIcon,
  LockIcon,
  LockOpenIcon,
  PenLineIcon,
  ShieldCheckIcon,
} from "lucide-react";

export const runtimeModeConfig: Record<
  RuntimeMode,
  { label: string; description: string; icon: LucideIcon }
> = {
  "approval-required": {
    label: "Supervised",
    description: "Ask before commands and file changes.",
    icon: LockIcon,
  },
  "codex-auto-review": {
    label: "Auto-review",
    description: "Let Codex review approvals automatically and ask only when needed.",
    icon: ShieldCheckIcon,
  },
  "auto-accept-edits": {
    label: "Auto-accept edits",
    description: "Auto-approve edits, ask before other actions.",
    icon: PenLineIcon,
  },
  "full-access": {
    label: "Full access",
    description: "Allow commands and edits without prompts.",
    icon: LockOpenIcon,
  },
};

export const runtimeModeOptions: RuntimeMode[] = [
  "approval-required",
  "codex-auto-review",
  "auto-accept-edits",
  "full-access",
];

export const runtimeModeOptionsForProvider = (provider: ProviderDriverKind): RuntimeMode[] =>
  provider === "codex"
    ? runtimeModeOptions
    : runtimeModeOptions.filter((mode) => mode !== "codex-auto-review");
