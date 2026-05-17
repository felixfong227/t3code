import { describe, expect, it } from "vitest";

import { canCollapseAppSidebar } from "./AppSidebarLayout.logic";

describe("canCollapseAppSidebar", () => {
  it("allows collapse in chat/editor routes", () => {
    expect(canCollapseAppSidebar("/")).toBe(true);
    expect(canCollapseAppSidebar("/environment-local/thread-123")).toBe(true);
  });

  it("keeps settings routes expanded", () => {
    expect(canCollapseAppSidebar("/settings")).toBe(false);
    expect(canCollapseAppSidebar("/settings/general")).toBe(false);
  });
});
