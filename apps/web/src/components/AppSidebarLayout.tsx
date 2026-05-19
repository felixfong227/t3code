import { useEffect, useRef, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";

import ThreadSidebar from "./Sidebar";
import { Sidebar, SidebarRail, useSidebar } from "./ui/sidebar";
import {
  canCollapseAppSidebar,
  shouldAutoCollapseAppSidebar,
  shouldAutoReopenAppSidebar,
  shouldWatchForDelayedChatPanel,
  THREAD_MAIN_CONTENT_MIN_WIDTH,
} from "./AppSidebarLayout.logic";
import {
  clearShortcutModifierState,
  syncShortcutModifierStateFromKeyboardEvent,
} from "../shortcutModifierState";
import { useSettings } from "../hooks/useSettings";

const THREAD_SIDEBAR_WIDTH_STORAGE_KEY = "chat_thread_sidebar_width";
const THREAD_SIDEBAR_MIN_WIDTH = 13 * 16;
const THREAD_SIDEBAR_DEFAULT_WIDTH = 16 * 16;
export function AppSidebarLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const sidebarCanCollapse = canCollapseAppSidebar(pathname);
  const autoCollapseSessionSidebarForNarrowChat = useSettings(
    (settings) => settings.autoCollapseSessionSidebarForNarrowChat,
  );
  const autoReopenSessionSidebarWhenSpaceAvailable = useSettings(
    (settings) => settings.autoReopenSessionSidebarWhenSpaceAvailable,
  );
  const { isMobile, open, setOpen } = useSidebar();
  const autoCollapsedRef = useRef(false);

  useEffect(() => {
    if (open) {
      autoCollapsedRef.current = false;
    }
  }, [open]);

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
      isMobile ||
      typeof ResizeObserver === "undefined" ||
      (!open && (!autoReopenSessionSidebarWhenSpaceAvailable || !autoCollapsedRef.current))
    ) {
      return;
    }

    const readSidebarWidth = () => {
      const sidebarContainer = document.querySelector<HTMLElement>(
        "[data-slot='sidebar'][data-side='left'] [data-slot='sidebar-container']",
      );
      const sidebarWidth = sidebarContainer?.getBoundingClientRect().width ?? 0;
      return sidebarWidth > 0 ? sidebarWidth : THREAD_SIDEBAR_DEFAULT_WIDTH;
    };

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
          autoCollapsedRef.current = true;
          void setOpen(false);
          return;
        }

        if (
          shouldAutoReopenAppSidebar({
            canCollapse: sidebarCanCollapse,
            chatPanelWidth: width,
            enabled: autoReopenSessionSidebarWhenSpaceAvailable,
            isMobile,
            open,
            sidebarWidth: readSidebarWidth(),
            wasAutoCollapsed: autoCollapsedRef.current,
          })
        ) {
          autoCollapsedRef.current = false;
          void setOpen(true);
        }
      });
    };

    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    const bindChatPanel = () => {
      if (resizeObserver) {
        return true;
      }

      const chatPanel = document.querySelector<HTMLElement>("[data-chat-main-panel='true']");
      if (!chatPanel) {
        return false;
      }

      checkWidth(chatPanel.getBoundingClientRect().width);

      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        const width = entry?.contentRect.width ?? chatPanel.getBoundingClientRect().width;
        checkWidth(width);
      });
      resizeObserver.observe(chatPanel);
      return true;
    };

    if (!bindChatPanel() && shouldWatchForDelayedChatPanel(pathname)) {
      mutationObserver = new MutationObserver(() => {
        if (bindChatPanel()) {
          mutationObserver?.disconnect();
          mutationObserver = null;
        }
      });
      const observerRoot =
        document.querySelector<HTMLElement>("[data-slot='sidebar-wrapper']") ?? document.body;
      mutationObserver.observe(observerRoot, { childList: true, subtree: true });
    }

    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [
    autoCollapseSessionSidebarForNarrowChat,
    autoReopenSessionSidebarWhenSpaceAvailable,
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
