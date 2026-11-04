"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

export function RouteStyling() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const path = pathname.replace(/\/$/, "") || "/";
    const chapterMatch = path.match(/^\/(?:titus)\/(\d+)$/);

    const resetReaderViewport = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      html.scrollTop = 0;
      body.scrollTop = 0;
    };

    html.classList.add("dark");
    html.style.colorScheme = "dark";
    body.classList.add("mbe-shell-managed");
    body.removeAttribute("data-titus-chapter");

    if (path === "/") body.dataset.titusRoute = "home";
    else if (path === "/background") body.dataset.titusRoute = "introduction";
    else if (chapterMatch) {
      body.dataset.titusRoute = "commentary";
      body.dataset.titusChapter = chapterMatch[1];
      resetReaderViewport();
    } else body.removeAttribute("data-titus-route");
  }, [pathname]);

  return null;
}
