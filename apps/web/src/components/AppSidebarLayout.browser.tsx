import "../index.css";

import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { page } from "vitest/browser";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { useState } from "react";

import { __resetLocalApiForTests } from "../localApi";
import { AppSidebarLayout } from "./AppSidebarLayout";
import { SidebarProvider } from "./ui/sidebar";

vi.mock("./Sidebar", () => ({
  default: () => <div data-testid="thread-sidebar" />,
}));

function DelayedNarrowChatPanel() {
  const [showPanel, setShowPanel] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setShowPanel(true)}>
        Show narrow chat panel
      </button>
      {showPanel ? (
        <main data-chat-main-panel="true" style={{ flex: "0 0 auto", height: 100, width: 500 }} />
      ) : null}
    </>
  );
}

function renderAppSidebarLayout() {
  const rootRoute = createRootRoute({
    component: () => (
      <SidebarProvider defaultOpen>
        <AppSidebarLayout>
          <DelayedNarrowChatPanel />
        </AppSidebarLayout>
      </SidebarProvider>
    ),
  });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: rootRoute,
  });

  return render(<RouterProvider router={router} />);
}

describe("AppSidebarLayout auto-collapse", () => {
  let mounted: Awaited<ReturnType<typeof render>> | null = null;

  beforeEach(async () => {
    await page.viewport(1280, 720);
    await __resetLocalApiForTests();
    localStorage.clear();
  });

  afterEach(async () => {
    await mounted?.unmount?.();
    mounted = null;
    document.body.innerHTML = "";
    await __resetLocalApiForTests();
  });

  it("auto-collapses when the chat panel appears after the layout mounted", async () => {
    mounted = await renderAppSidebarLayout();

    await expect
      .element(page.getByRole("button", { name: "Show narrow chat panel" }))
      .toBeInTheDocument();
    expect(
      document.querySelector("[data-slot='sidebar-wrapper']")?.getAttribute("data-state"),
    ).toBe("expanded");

    await page.getByRole("button", { name: "Show narrow chat panel" }).click();

    await vi.waitFor(() => {
      expect(
        document.querySelector("[data-slot='sidebar-wrapper']")?.getAttribute("data-state"),
      ).toBe("collapsed");
    });
  });
});
