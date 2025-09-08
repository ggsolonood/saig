// /lib/auth.js
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-please-change";

export function getAuthUser() {
  const token = cookies().get("auth")?.value;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // รองรับทั้งกรณีที่เซ็นด้วย userId หรือใช้ sub
    const uid = payload.userId || payload.sub || payload.id;
    if (!uid) return null;

    return {
      userId: String(uid),
      username: payload.username ?? null,
      role: payload.role ?? "user",
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
