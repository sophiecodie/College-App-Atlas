import type { ReactNode } from "react";

import { PageTransition } from "@/components/cozy/page-transition";

// Re-mounts on every navigation, giving each page a gentle fade-in.
export default function Template({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
