import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { ReactNode } from "react";

import { auth } from "@/auth";
import { signOutUser } from "@/app/actions";
import { SiteNav } from "@/app/components/site-nav";

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
            <div className="site-brand-wrap">
              <Link className="brand-mark" href={session?.user ? "/app" : "/"}>
                College Atlas
              </Link>
              {session?.user ? <span className="site-brand-note">Student workspace</span> : null}
            </div>
            {session?.user ? <SiteNav /> : <span className="muted">Launch stack in progress</span>}
            <div className="site-header-actions">
              {session?.user ? (
                <>
                  <form action={signOutUser}>
                    <button className="nav-button" type="submit">
                      Sign out
                    </button>
                  </form>
                </>
              ) : null}
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
