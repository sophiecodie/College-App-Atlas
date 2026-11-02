"use client";

import { motion } from "motion/react";
import { ChevronsLeft, ChevronsRight, Home, Landmark, LogOut, Menu, PenLine, Settings, ShieldCheck, Star, Telescope, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

import { signOutUser } from "@/app/actions";
import { ART } from "@/lib/illustrations";

const NAV = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/essays", label: "Writing Studio", icon: PenLine },
  { href: "/colleges", label: "My Colleges", icon: Landmark },
  { href: "/research", label: "AI Research", icon: Telescope },
  { href: "/activities", label: "Activities", icon: Star },
  { href: "/settings", label: "Settings", icon: Settings },
];

const STORAGE_KEY = "atlas.sidebarCollapsed";

/** Signed-in frame: collapsible sidebar on desktop, drawer + top bar on mobile. */
export function AppShell({ isAdmin, children }: { isAdmin: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Storage can be unavailable (private mode); the sidebar just starts expanded.
    }
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  function toggleCollapsed() {
    setCollapsed((value) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, value ? "0" : "1");
      } catch {
        // ignore
      }
      return !value;
    });
  }

  // Onboarding is a standalone, focused flow.
  if (pathname.startsWith("/welcome")) {
    return <>{children}</>;
  }

  const items = isAdmin ? [...NAV, { href: "/admin", label: "Admin", icon: ShieldCheck }] : NAV;

  return (
    <div className={`app-frame ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
      <aside aria-label="Primary" className="app-sidebar">
        <div className="sidebar-brand">
          <Link className="brand-mark" href="/app">
            CollegeAtlas<span className="sparkle">✦</span>
          </Link>
          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="sidebar-collapse desktop-only"
            onClick={toggleCollapsed}
            type="button"
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
          <button aria-label="Close menu" className="sidebar-collapse mobile-only" onClick={() => setMobileOpen(false)} type="button">
            <X size={16} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link aria-current={active ? "page" : undefined} className={`sidebar-link ${active ? "active" : ""}`} href={item.href} key={item.href} title={item.label}>
                {active ? <motion.span className="active-bg" layoutId="sidebar-active" transition={{ type: "spring", stiffness: 420, damping: 36 }} /> : null}
                <Icon size={18} strokeWidth={1.8} />
                <span className="sidebar-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <Image alt="" className="sidebar-cat" height={ART.flowers.height} src={ART.flowers.src} width={ART.flowers.width} />
          <form action={signOutUser} style={{ width: "100%" }}>
            <button className="sidebar-signout" title="Sign out" type="submit">
              <LogOut size={15} />
              <span className="sidebar-label">Sign out</span>
            </button>
          </form>
        </div>
      </aside>

      {mobileOpen ? <div aria-hidden="true" className="sidebar-scrim" onClick={() => setMobileOpen(false)} /> : null}

      <div className="app-main">
        <header className="mobile-topbar">
          <button aria-label="Open menu" className="sidebar-collapse" onClick={() => setMobileOpen(true)} type="button">
            <Menu size={18} />
          </button>
          <Link className="brand-mark" href="/app">
            CollegeAtlas<span className="sparkle">✦</span>
          </Link>
          <span style={{ width: 30 }} />
        </header>
        {children}
      </div>
    </div>
  );
}
