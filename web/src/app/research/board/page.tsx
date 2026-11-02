import { redirect } from "next/navigation";

// The research database now lives on /research; keep old links working.
export default async function ResearchBoardRedirect({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { sort } = await searchParams;
  redirect(sort ? `/research?sort=${encodeURIComponent(sort)}` : "/research");
}
