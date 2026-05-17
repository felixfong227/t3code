export function canCollapseAppSidebar(pathname: string): boolean {
  return !pathname.startsWith("/settings");
}
