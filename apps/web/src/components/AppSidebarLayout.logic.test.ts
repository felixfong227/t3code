import { describe, expect, it } from "vitest";

import {
  canCollapseAppSidebar,
  shouldAutoCollapseAppSidebar,
  shouldAutoReopenAppSidebar,
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

describe("shouldAutoReopenAppSidebar", () => {
  const autoCollapsedDesktopClosedInput = {
    canCollapse: true,
    enabled: true,
    isMobile: false,
    open: false,
    sidebarWidth: 256,
    wasAutoCollapsed: true,
  };

  it("reopens when the chat panel would still meet the minimum after restoring the sidebar", () => {
    expect(
      shouldAutoReopenAppSidebar({
        ...autoCollapsedDesktopClosedInput,
        chatPanelWidth: THREAD_MAIN_CONTENT_MIN_WIDTH + 256,
      }),
    ).toBe(true);
  });

  it("does not reopen when restoring the sidebar would make chat too narrow", () => {
    expect(
      shouldAutoReopenAppSidebar({
        ...autoCollapsedDesktopClosedInput,
        chatPanelWidth: THREAD_MAIN_CONTENT_MIN_WIDTH + 255,
      }),
    ).toBe(false);
  });

  it("does not reopen when disabled or not auto-collapsed", () => {
    expect(
      shouldAutoReopenAppSidebar({
        ...autoCollapsedDesktopClosedInput,
        enabled: false,
        chatPanelWidth: THREAD_MAIN_CONTENT_MIN_WIDTH + 256,
      }),
    ).toBe(false);
    expect(
      shouldAutoReopenAppSidebar({
        ...autoCollapsedDesktopClosedInput,
        wasAutoCollapsed: false,
        chatPanelWidth: THREAD_MAIN_CONTENT_MIN_WIDTH + 256,
      }),
    ).toBe(false);
  });

  it("does not reopen on mobile, open sidebars, or non-collapsible routes", () => {
    expect(
      shouldAutoReopenAppSidebar({
        ...autoCollapsedDesktopClosedInput,
        isMobile: true,
        chatPanelWidth: THREAD_MAIN_CONTENT_MIN_WIDTH + 256,
      }),
    ).toBe(false);
    expect(
      shouldAutoReopenAppSidebar({
        ...autoCollapsedDesktopClosedInput,
        open: true,
        chatPanelWidth: THREAD_MAIN_CONTENT_MIN_WIDTH + 256,
      }),
    ).toBe(false);
    expect(
      shouldAutoReopenAppSidebar({
        ...autoCollapsedDesktopClosedInput,
        canCollapse: false,
        chatPanelWidth: THREAD_MAIN_CONTENT_MIN_WIDTH + 256,
      }),
    ).toBe(false);
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
