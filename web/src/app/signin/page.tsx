import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { devLoginEnabled } from "@/lib/dev-login";
import { guestEnabled } from "@/lib/guest";
import { ART } from "@/lib/illustrations";

export default async function StartPage() {
  const session = await auth();
  if (session?.user?.email) redirect("/app");

  return (
    <main className="auth-page">
      <div className="auth-scenery">
        <Image alt="" fill priority sizes="100vw" src={ART.panorama.src} />
      </div>
      <section className="auth-card">
        <Link className="brand-mark" href="/">
          CollegeAtlas<span className="sparkle">✦</span>
        </Link>
        <h1>Start your journey</h1>
        <p className="muted">No account needed. Jump in and start organizing your college applications.</p>

        {guestEnabled() ? (
          <form action="/api/guest" className="auth-options" method="post">
            <button className="cozy-button large auth-start" type="submit">
              Start <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <p className="muted">New sessions are paused right now. Please check back soon.</p>
        )}
        {devLoginEnabled() ? (
          <form action="/api/dev-login" className="auth-options" method="post">
            <button className="auth-option" type="submit">
              Sign in as test student (local only)
            </button>
          </form>
        ) : null}

        <p className="auth-fineprint muted">
          Your work is saved to your private session in this browser. Accounts are coming soon; when you create one, your
          work comes with you. Until then, clearing this browser&apos;s cookies or switching devices starts a new session.
        </p>
      </section>
    </main>
  );
}
