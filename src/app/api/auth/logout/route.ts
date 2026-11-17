// POST /api/auth/logout — выход (очистка cookie).

import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/app/api/_lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearAuthCookie(response);
  return response;
}
