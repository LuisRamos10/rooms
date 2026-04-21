import "server-only";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

export async function getRequiredSession(): Promise<Session & { orgId: string; orgName: string; role: string }> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session as Session & { orgId: string; orgName: string; role: string };
}
