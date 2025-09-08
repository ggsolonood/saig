// app/api/posts/[id]/route.js
import { NextResponse } from "next/server";
import { connectMongoDB } from "../../../../../lib/mongodb";
import Post from "../../../../../models/post";
import mongoose from "mongoose";
import { getAuthUser } from "../../../../../lib/auth";

export const dynamic = "force-dynamic";

/* -------------------------------------------
   Helpers: สร้าง "วันล้วน (UTC 00:00)" จากหลายฟอร์แมต
------------------------------------------- */

// กันปี พ.ศ./ปีเพี้ยน
function normalizeYear(y) {
  if (!Number.isFinite(y)) return null;
  if (y >= 2400) y -= 543;              // พ.ศ. → ค.ศ.
  if (y < 1900 || y > 2100) return null;
  return y;
}
function dateOnlyFromYMDUTC(y, m, d) {
  y = normalizeYear(Number(y));
  m = Number(m);
  d = Number(d);
  if (!y || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}
function toDateOnlyUTC(dt) {
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}
function parseAnyToDateOnlyUTC(input) {
  // string: 'YYYY-MM-DD' หรือ ISO
  if (typeof input === "string") {
    const m = input.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return dateOnlyFromYMDUTC(Number(m[1]), Number(m[2]), Number(m[3]));
    const dt = new Date(input);
    if (!Number.isNaN(dt.getTime())) return toDateOnlyUTC(dt);
    return null;
  }
  // Date instance
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    return toDateOnlyUTC(input);
  }
  // object {year,month,day} | {y,m,d} | {date:{...}}
  if (input && typeof input === "object") {
    const s = input.date ? input.date : input;
    const y = s.year ?? s.y;
    const m = s.month ?? s.m;
    const d = s.day ?? s.d;
    if (y != null && m != null && d != null) return dateOnlyFromYMDUTC(y, m, d);
  }
  return null;
}

/** แปลง input availability → [{date: Date(UTC)}] พร้อมลบค่าซ้ำ/ข้ามค่าที่ไม่ถูกต้อง
 * รองรับ:
 *  - 'YYYY-MM-DD' | ISO string
 *  - Date
 *  - { y,m,d } / { year,month,day } / { date:{...} }
 *  - { from:..., to:... } (ช่วงวัน รวมปลายทั้งสอง)
 */
function normalizeAvailability(input) {
  if (!Array.isArray(input)) return [];
  const uniq = new Set();

  const pushDate = (any) => {
    const d = parseAnyToDateOnlyUTC(any);
    if (!d) return;
    uniq.add(d.toISOString()); // ใช้ ISO ของเที่ยงคืน UTC เพื่อ dedupe
  };

  for (const v of input) {
    if (!v) continue;

    // 1) ช่วงวัน {from, to}
    if (v.from && v.to) {
      const a = parseAnyToDateOnlyUTC(v.from);
      const b = parseAnyToDateOnlyUTC(v.to);
      if (!a || !b) continue;
      // ป้องกันลูปยาวเกินเหตุ: จำกัดไม่เกิน ~400 วัน
      let cur = new Date(a.getTime());
      let guard = 0;
      while (cur.getTime() <= b.getTime() && guard < 400) {
        uniq.add(cur.toISOString());
        cur = new Date(cur.getTime() + 86400000); // +1 วัน
        guard++;
      }
      continue;
    }

    // 2) รายวัน: รองรับ string/Date/{y,m,d}/{date:{...}}
    pushDate(v);
  }

  return Array.from(uniq).map((iso) => ({ date: new Date(iso) }));
}

// GET /api/posts/:id  (เปิดหน้าแก้ไข/หน้า detail)
export async function GET(_req, { params }) {
  try {
    const { id } = params || {};
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }
    await connectMongoDB();

    // ส่ง availability/timeZone ออกไปด้วยให้หน้า /book ใช้ได้แน่ ๆ
    const doc = await Post.findById(id)
      .select("-__v") // ตัด __v ออก
      .lean();

    if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });

    return NextResponse.json(doc, { status: 200 });
  } catch (e) {
    console.error("GET /api/posts/:id error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/posts/:id  (แก้ไข—ต้องเป็นเจ้าของ)
export async function PATCH(req, { params }) {
  try {
    // ใช้รูปแบบ sync ที่คุณต้องการ
    const auth = getAuthUser();
    if (!auth?.userId || !mongoose.Types.ObjectId.isValid(auth.userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params || {};
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const {
      title = "",
      img = "",
      content = "",
      price,
      zones = [],
      activities = [],
      availability = [], // ← รับหลายฟอร์แมตตาม normalizeAvailability
      status,            // "active" | "paused" (ออปชัน)
    } = body || {};

    await connectMongoDB();

    // ตรวจว่าโพสต์มีอยู่ และผู้แก้เป็นเจ้าของจริง
    const doc = await Post.findById(id);
    if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (String(doc.user) !== String(auth.userId)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // validations
    if (!title.trim() || !img.trim() || !content.trim()) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
    }
    if (content.trim().length < 10) {
      return NextResponse.json({ error: "เนื้อหาต้องมีอย่างน้อย 10 ตัวอักษร" }, { status: 400 });
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return NextResponse.json({ error: "ราคาไม่ถูกต้อง" }, { status: 400 });
    }
    try {
      const u = new URL(img);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error("bad url");
    } catch {
      return NextResponse.json({ error: "URL รูปภาพไม่ถูกต้อง" }, { status: 400 });
    }

    // ✅ Normalize availability → [{ date: Date(UTC) }, ...]
    const availabilityDocs = normalizeAvailability(availability);

    // อัปเดตฟิลด์
    doc.title = title.trim();
    doc.img = img.trim();
    doc.content = content.trim();
    doc.price = priceNum;
    doc.zones = Array.isArray(zones) ? zones : [];
    doc.activities = Array.isArray(activities) ? activities : [];
    doc.availability = availabilityDocs; // ให้ตรงสคีมา (เก็บวันล้วน UTC)
    if (status && (status === "active" || status === "paused")) {
      doc.status = status;
    }

    await doc.save();
    return NextResponse.json({ ok: true, id: doc._id }, { status: 200 });
  } catch (e) {
    console.error("PATCH /api/posts/:id error:", e);
    const isValidation =
      e?.name === "ValidationError" || e?.name === "MongoServerError";
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: isValidation ? 400 : 500 }
    );
  }
}
