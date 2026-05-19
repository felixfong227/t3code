import { describe, expect, it } from "vitest";

import {
  canCollapseAppSidebar,
  shouldAutoCollapseAppSidebar,
  THREAD_MAIN_CONTENT_MIN_WIDTH,
} from "./AppSidebarLayout.logic";

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

describe("shouldAutoCollapseAppSidebar", () => {
  const collapsibleDesktopOpenInput = {
    canCollapse: true,
    enabled: true,
    isMobile: false,
    open: true,
  };

  it("collapses when the chat panel is below the minimum width", () => {
    expect(
      shouldAutoCollapseAppSidebar({
        ...collapsibleDesktopOpenInput,
        chatPanelWidth: THREAD_MAIN_CONTENT_MIN_WIDTH - 1,
      }),
    ).toBe(true);
  });

  it("does not collapse when disabled", () => {
    expect(
      shouldAutoCollapseAppSidebar({
        ...collapsibleDesktopOpenInput,
        enabled: false,
        chatPanelWidth: THREAD_MAIN_CONTENT_MIN_WIDTH - 1,
      }),
    ).toBe(false);
  });

  it("does not collapse when the route cannot collapse", () => {
    expect(
      shouldAutoCollapseAppSidebar({
        ...collapsibleDesktopOpenInput,
        canCollapse: false,
        chatPanelWidth: THREAD_MAIN_CONTENT_MIN_WIDTH - 1,
      }),
    ).toBe(false);
  });

  it("does not collapse on mobile", () => {
    expect(
      shouldAutoCollapseAppSidebar({
        ...collapsibleDesktopOpenInput,
        isMobile: true,
        chatPanelWidth: THREAD_MAIN_CONTENT_MIN_WIDTH - 1,
      }),
    ).toBe(false);
  });

  it("does not collapse when the sidebar is already closed", () => {
    expect(
      shouldAutoCollapseAppSidebar({
        ...collapsibleDesktopOpenInput,
        open: false,
        chatPanelWidth: THREAD_MAIN_CONTENT_MIN_WIDTH - 1,
      }),
    ).toBe(false);
  });

  it("does not collapse at or above the minimum width", () => {
    expect(
      shouldAutoCollapseAppSidebar({
        ...collapsibleDesktopOpenInput,
        chatPanelWidth: THREAD_MAIN_CONTENT_MIN_WIDTH,
      }),
    ).toBe(false);
    expect(
      shouldAutoCollapseAppSidebar({
        ...collapsibleDesktopOpenInput,
        chatPanelWidth: THREAD_MAIN_CONTENT_MIN_WIDTH + 1,
      }),
    ).toBe(false);
  });

  it("honors a custom minimum width", () => {
    expect(
      shouldAutoCollapseAppSidebar({
        ...collapsibleDesktopOpenInput,
        chatPanelWidth: 479,
        minChatPanelWidth: 480,
      }),
    ).toBe(true);
  });
});
