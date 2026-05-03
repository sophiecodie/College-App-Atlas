import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { ReactNode } from "react";

import { auth } from "@/auth";
import { signOutUser } from "@/app/actions";
import { mainNav } from "@/lib/shell";

export const metadata: Metadata = {
  title: "College Atlas",
  description: "The launch-ready web app for College Atlas.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <header className="site-header">
          <div className="site-header-inner">
            <Link className="brand-mark" href={session?.user ? "/app" : "/"}>
              College Atlas
            </Link>
            <nav className="site-nav">
              {session?.user ? (
                <>
                  {mainNav.map((item) => (
                    <Link href={item.href} key={item.href}>
                      {item.label}
                    </Link>
                  ))}
                  <form action={signOutUser}>
                    <button className="nav-button" type="submit">
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <span className="muted">Launch stack in progress</span>
              )}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
