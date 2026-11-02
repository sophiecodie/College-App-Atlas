"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { mainNav } from "@/lib/shell";

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="site-nav" aria-label="Primary">
      {mainNav.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/app" && pathname.startsWith(item.href));

        return (
          <Link
            className={`site-nav-link ${active ? "active" : ""}`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
