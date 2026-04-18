import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Cleanup any lingering Radix UI side effects (Dialog/Sheet/Popover) that can
 * leave the page in a "blank/unclickable" state after navigation:
 *  - body[style*="pointer-events: none"]  (overlay lock not released)
 *  - body[data-scroll-locked]             (scroll lock not released)
 *  - leftover overlay/portal nodes that were not unmounted
 *
 * Runs on every route change.
 */
export function RouteCleanup() {
  const location = useLocation();

  useEffect(() => {
    // Defer to next tick so Radix has a chance to unmount cleanly first.
    const timer = window.setTimeout(() => {
      const body = document.body;
      if (!body) return;

      // Release pointer-events lock
      if (body.style.pointerEvents === "none") {
        body.style.pointerEvents = "";
      }
      // Release Radix scroll lock attributes
      if (body.hasAttribute("data-scroll-locked")) {
        body.removeAttribute("data-scroll-locked");
      }
      body.style.removeProperty("overflow");
      body.style.removeProperty("padding-right");

      // Remove any orphan overlays that were not unmounted
      document
        .querySelectorAll<HTMLElement>(
          '[data-radix-dialog-overlay][data-state="closed"], [data-radix-popper-content-wrapper][data-state="closed"]'
        )
        .forEach((el) => el.remove());
    }, 0);

    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  return null;
}
