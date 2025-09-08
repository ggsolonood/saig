// app/api/auth/me/route.js
import { NextResponse } from "next/server";
import { getAuthUser } from "../../../../../lib/auth"; // ปรับ path ให้ตรงโปรเจกต์คุณ

// ปิดการแคชเพื่อให้สถานะล็อกอินอัปเดตเสมอ
export const dynamic = "force-dynamic";
// ถ้าฟังก์ชัน auth ของคุณอาศัย Node APIs (เช่น jwt, crypto ฯลฯ) แนะนำให้บังคับรันบน Node.js Runtime
export const runtime = "nodejs";

export async function GET() {
  try {
    // อ่าน JWT จากคุกกี้ 'auth' ด้วย server API (next/headers ภายใน getAuthUser)
    const auth = getAuthUser(); // ⬅️ ฟังก์ชันนี้ควรเป็น synchronous (ไม่ต้อง await)

    // ยังไม่ล็อกอิน → คืน user:null ด้วย 200
    if (!auth || !auth.userId) {
      return NextResponse.json(
        { user: null },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    // ล็อกอินแล้ว → ส่งข้อมูลขั้นต่ำกลับ
    return NextResponse.json(
      {
        user: {
          id: auth.userId,
          username: auth.username ?? auth.email ?? "user",
          role: auth.role ?? "user",
        },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    // ป้องกันกรณี token พัง/หมดอายุ → ปฏิบัติเหมือนไม่ล็อกอิน
    return NextResponse.json(
      { user: null },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
