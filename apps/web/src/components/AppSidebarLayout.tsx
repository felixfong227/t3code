import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";

import ThreadSidebar from "./Sidebar";
import { Sidebar, SidebarRail, useSidebar } from "./ui/sidebar";
import {
  canCollapseAppSidebar,
  shouldAutoCollapseAppSidebar,
  THREAD_MAIN_CONTENT_MIN_WIDTH,
} from "./AppSidebarLayout.logic";
import {
  clearShortcutModifierState,
  syncShortcutModifierStateFromKeyboardEvent,
} from "../shortcutModifierState";
import { useSettings } from "../hooks/useSettings";

const THREAD_SIDEBAR_WIDTH_STORAGE_KEY = "chat_thread_sidebar_width";
const THREAD_SIDEBAR_MIN_WIDTH = 13 * 16;
export function AppSidebarLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const sidebarCanCollapse = canCollapseAppSidebar(pathname);
  const autoCollapseSessionSidebarForNarrowChat = useSettings(
    (settings) => settings.autoCollapseSessionSidebarForNarrowChat,
  );
  const { isMobile, open, setOpen } = useSidebar();

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      syncShortcutModifierStateFromKeyboardEvent(event);
    };
    const onWindowKeyUp = (event: KeyboardEvent) => {
      syncShortcutModifierStateFromKeyboardEvent(event);
    };
    const onWindowBlur = () => {
      clearShortcutModifierState();
    };

    window.addEventListener("keydown", onWindowKeyDown, true);
    window.addEventListener("keyup", onWindowKeyUp, true);
    window.addEventListener("blur", onWindowBlur);

    return () => {
      window.removeEventListener("keydown", onWindowKeyDown, true);
      window.removeEventListener("keyup", onWindowKeyUp, true);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, []);

  useEffect(() => {
    const onMenuAction = window.desktopBridge?.onMenuAction;
    if (typeof onMenuAction !== "function") {
      return;
    }

    const unsubscribe = onMenuAction((action) => {
      if (action === "open-settings") {
        void navigate({ to: "/settings" });
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [navigate]);

  useEffect(() => {
    if (
      !autoCollapseSessionSidebarForNarrowChat ||
      !sidebarCanCollapse ||
      !open ||
      isMobile ||
      typeof ResizeObserver === "undefined"
    ) {
      return;
    }

    const chatPanel = document.querySelector<HTMLElement>("[data-chat-main-panel='true']");
    if (!chatPanel) {
      return;
    }

    let animationFrame: number | null = null;
    const checkWidth = (width: number) => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        if (
          shouldAutoCollapseAppSidebar({
            canCollapse: sidebarCanCollapse,
            chatPanelWidth: width,
            enabled: autoCollapseSessionSidebarForNarrowChat,
            isMobile,
            open,
          })
        ) {
          void setOpen(false);
        }
      });
    };

    checkWidth(chatPanel.getBoundingClientRect().width);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = entry?.contentRect.width ?? chatPanel.getBoundingClientRect().width;
      checkWidth(width);
    });
    resizeObserver.observe(chatPanel);

    return () => {
      resizeObserver.disconnect();
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [
    autoCollapseSessionSidebarForNarrowChat,
    isMobile,
    open,
    pathname,
    setOpen,
    sidebarCanCollapse,
  ]);

  return (
    <>
      <Sidebar
        side="left"
        collapsible={sidebarCanCollapse ? "offcanvas" : "none"}
        className="border-r border-border bg-card text-foreground"
        resizable={{
          minWidth: THREAD_SIDEBAR_MIN_WIDTH,
          shouldAcceptWidth: ({ nextWidth, wrapper }) =>
            wrapper.clientWidth - nextWidth >= THREAD_MAIN_CONTENT_MIN_WIDTH,
          storageKey: THREAD_SIDEBAR_WIDTH_STORAGE_KEY,
        }}
      >
        <ThreadSidebar />
        {sidebarCanCollapse ? <SidebarRail /> : null}
      </Sidebar>
      {children}
    </>
  );
}
