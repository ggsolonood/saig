// app/api/auth/logout/route.js
import { NextResponse } from "next/server";

// ออกระบบผ่าน POST (ปุ่ม/log out action ฝั่ง client เรียกอันนี้)
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,            // ลบทันที
    expires: new Date(0), // กัน edge cases
  });
  return res;
}

// เผื่ออยากรองรับลิงก์ /api/auth/logout (GET) แล้วเด้งหน้าแรก
export async function GET(req) {
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set("auth", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  return res;
}
