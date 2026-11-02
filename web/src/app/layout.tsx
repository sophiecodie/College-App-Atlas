import "./globals.css";
import "./cozy.css";

import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { ReactNode } from "react";

import { auth } from "@/auth";
import { AppShell } from "@/components/cozy/app-shell";
import { MotionProvider } from "@/components/cozy/motion-provider";
import { isAdminEmail } from "@/lib/admin";
import { isGuestEmail } from "@/lib/guest";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap", axes: ["opsz"] });
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "CollegeAtlas",
  description: "Your college journey, mapped out. Brainstorm, write, research and track applications in one cozy place.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  return (
    <html className={`${serif.variable} ${sans.variable}`} lang="en">
      <body suppressHydrationWarning>
        <MotionProvider>
          {session?.user ? <AppShell isAdmin={isAdminEmail(session.user.email)} isGuest={isGuestEmail(session.user.email)}>{children}</AppShell> : children}
        </MotionProvider>
      </body>
    </html>
  );
}
