// app/api/auth/me/route.js
import { NextResponse } from "next/server";
import { getAuthUser } from "../../../../../lib/auth"; // ปรับ path ตามโครงสร้างของคุณ

export const dynamic = "force-dynamic"; // กัน cache ตอน dev/edge

export async function GET() {
  try {
    const auth = getAuthUser(); // อ่าน JWT จากคุกกี้ 'auth'
    if (!auth) {
      // ยังไม่ล็อกอิน
      return NextResponse.json({ user: null }, {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    // ล็อกอินแล้ว → ส่งข้อมูลขั้นต่ำกลับไป
    return NextResponse.json({
      user: {
        id: auth.userId,
        username: auth.username,
        role: auth.role || "user",
      },
    }, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    // ป้องกันกรณี token พัง/หมดอายุ
    return NextResponse.json({ user: null }, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}
