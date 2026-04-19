import { NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:3000/api/v1";

function toE164(phone: string) {
  // Convert 09XXXXXXXXX → +98XXXXXXXXX
  if (phone.startsWith("09")) return "+98" + phone.slice(1);
  if (phone.startsWith("+98")) return phone;
  return phone;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const raw = String(body?.phone ?? "").trim();
  // Backend expects 09XXXXXXXXX format based on the DTO regex
  const phoneNumber = raw.startsWith("+98") ? "0" + raw.slice(3) : raw;

  const res = await fetch(`${BACKEND}/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber }),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}