import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:3000/api/v1";

function toBackendPhone(phone: string) {
  if (phone.startsWith("+98")) return "0" + phone.slice(3);
  return phone;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const phone = String(body?.phone ?? "").trim();
  const code = String(body?.code ?? "").trim();

  const phoneNumber = toBackendPhone(phone);

  const res = await fetch(`${BACKEND}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber, otp: code }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

const response = NextResponse.json({
  ok: true,
  user: data.user,
  accessToken: data.accessToken,   // ← add
  refreshToken: data.refreshToken, // ← add
});

  // Store tokens in httpOnly cookies (server-side only, not accessible by JS)
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };

  response.cookies.set("accessToken", data.accessToken, {
    ...cookieOpts,
    maxAge: 60 * 15, // 15 minutes
  });
  response.cookies.set("refreshToken", data.refreshToken, {
    ...cookieOpts,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}