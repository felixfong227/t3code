export const THREAD_MAIN_CONTENT_MIN_WIDTH = 40 * 16;

export function canCollapseAppSidebar(pathname: string): boolean {
  return !pathname.startsWith("/settings");
}

export function shouldAutoCollapseAppSidebar(input: {
  canCollapse: boolean;
  enabled: boolean;
  isMobile: boolean;
  open: boolean;
  chatPanelWidth: number;
  minChatPanelWidth?: number;
}): boolean {
  return (
    input.enabled &&
    input.canCollapse &&
    !input.isMobile &&
    input.open &&
    input.chatPanelWidth < (input.minChatPanelWidth ?? THREAD_MAIN_CONTENT_MIN_WIDTH)
  );
}
