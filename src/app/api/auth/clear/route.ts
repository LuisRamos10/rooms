import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  const response = NextResponse.json({ cleared: true });

  for (const cookie of allCookies) {
    if (
      cookie.name.startsWith("authjs.") ||
      cookie.name.startsWith("__Secure-authjs.") ||
      cookie.name.startsWith("next-auth.")
    ) {
      response.cookies.delete(cookie.name);
    }
  }

  return response;
}
