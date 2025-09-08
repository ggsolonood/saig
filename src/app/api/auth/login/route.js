// app/api/auth/login/route.js
import { NextResponse } from "next/server";
import { connectMongoDB } from "../../../../../lib/mongodb";     // ปรับ path ให้ตรงโปรเจกต์คุณ
import User from "../../../../../models/user";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-please-change";

export async function POST(req) {
  try {
    const { identifier, password, remember } = await req.json();
    if (!identifier || !password) {
      return NextResponse.json({ message: "email/username และรหัสผ่านจำเป็น" }, { status: 400 });
    }

    await connectMongoDB();
    const idLower = String(identifier).toLowerCase().trim();

    // ต้อง .select("+password") ถ้า model ตั้ง select:false
    const user = await User.findOne({
      $or: [{ email: idLower }, { username: identifier.trim() }],
    }).select("+password +role +username");

    if (!user) return NextResponse.json({ message: "บัญชีหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });

    // ✅ ตรวจรหัสแบบง่ายสุด (ฐานข้อมูลเดิม)
    //   - ถ้าเก็บเป็น plain-text: ใช้เปรียบเทียบตรง ๆ (ไม่แนะนำในโปรดักชัน)
    //   - ถ้าเก็บเป็น bcrypt hash ให้เปลี่ยนเป็น:  const ok = await bcrypt.compare(password, user.password)
    const ok = password === user.password;
    if (!ok) return NextResponse.json({ message: "บัญชีหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });

    // ✅ เซ็น JWT โดยยัด userId ไว้ที่ sub (lib/auth.js ของคุณอ่านได้)
    const payload = {
      sub: String(user._id),
      username: user.username || user.email,
      role: user.role || "user",
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: remember ? "30d" : "1d" });

    // ✅ ตั้งคุกกี้ httpOnly ชื่อ "auth"
    const res = NextResponse.json({ ok: true, userId: user._id, username: payload.username });
    res.cookies.set("auth", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,         // ถ้ารันบน https ค่อยเปลี่ยนเป็น true
      path: "/",
      maxAge: remember ? 60 * 60 * 24 * 30 : undefined, // 30 วัน หรือเป็น session cookie
    });
    return res;
  } catch (e) {
    console.error("POST /api/auth/login error:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
