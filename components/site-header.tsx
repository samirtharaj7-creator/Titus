"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation is intentional for the static Pages export. */

import { usePathname } from "next/navigation";
import { BookOpenText, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "Home", active: (pathname: string) => pathname === "/" },
  { href: "/background/", label: "Introduction", active: (pathname: string) => pathname === "/background" },
  { href: "/titus/1/", label: "Titus", active: (pathname: string) => pathname.startsWith("/titus") }
];

export function SiteHeader() {
  const pathname = usePathname();
  const activePathname = pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
  const [open, setOpen] = useState(false);

  return (
    <header className="reader-header no-print">
      <a href="/" className="reader-brand" aria-label="Titus Study Home">
        <span className="reader-logo" aria-hidden="true">
          <BookOpenText className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <span className="reader-brand-text">
          <span className="reader-brand-strong">Titus Study</span>
        </span>
      </a>

      <nav className="reader-nav" aria-label="Primary navigation">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={link.active(activePathname) ? "reader-nav-link reader-nav-link-active" : "reader-nav-link"}
            aria-current={link.active(activePathname) ? "page" : undefined}
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className="reader-header-actions">
        <Button
          className="reader-menu-button"
          variant="ghost"
          size="icon"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {open ? (
        <nav className="reader-menu">
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
            {links.map((link) => {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={link.active(activePathname) ? "reader-menu-link reader-menu-link-active" : "reader-menu-link"}
                  aria-current={link.active(activePathname) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              );
            })}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
