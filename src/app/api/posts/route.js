// app/api/posts/route.js
import { NextResponse } from "next/server";
import { connectMongoDB } from "../../../../lib/mongodb";
import Post from "../../../../models/post";
import Rating from "../../../../models/rating"; // ⬅ เพิ่ม
import mongoose from "mongoose";
import { getAuthUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

/** ช่วยแปลง input availability ให้เป็นรูป [{date:Date}] และกำจัดค่าซ้ำ/ไม่ถูกต้อง */
function normalizeAvailability(input) {
  if (!Array.isArray(input)) return [];
  const uniq = new Set();

  for (const v of input) {
    const raw =
      typeof v === "string" || v instanceof Date
        ? v
        : v && v.date
        ? v.date
        : null;
    if (!raw) continue;

    const d = new Date(raw);
    if (isNaN(d.getTime())) continue;

    // ปรับเป็นเที่ยงคืน UTC ป้องกัน timezone เพี้ยน
    const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    uniq.add(utc.toISOString());
  }

  return Array.from(uniq).map((iso) => ({ date: new Date(iso) }));
}

/** GET /api/posts?limit=6 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.max(0, parseInt(searchParams.get("limit") || "6", 10)) || 6;

    await connectMongoDB();

    // 1) ดึงโพสต์
    const rows = await Post.find({}, { __v: 0 })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    if (rows.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // 2) รวม id สำหรับไปสรุปเรตติ้ง
    const ids = rows.map((p) => p._id);

    // 3) สรุปเรตติ้งจาก Rating -> (lookup) Bookings -> group ตาม booking.post
    const sums = await Rating.aggregate([
      { $match: {} },
      {
        $lookup: {
          from: "bookings",            // ชื่อคอลเลกชันของโมเดล Booking
          localField: "booking",
          foreignField: "_id",
          as: "bk",
        },
      },
      { $unwind: "$bk" },
      { $match: { "bk.post": { $in: ids } } },
      {
        $group: {
          _id: "$bk.post",
          avg: { $avg: "$stars" },
          count: { $sum: 1 },
        },
      },
    ]);

    const sumMap = new Map(
      sums.map((s) => [String(s._id), { avg: s.avg || 0, count: s.count || 0 }])
    );

    // 4) แนบ ratingAvg/ratingCount ให้ผลลัพธ์ (ไม่ต้องเก็บใน DB)
    const out = rows.map((p) => {
      const s = sumMap.get(String(p._id));
      return {
        ...p,
        ratingAvg: s?.avg ?? 0,
        ratingCount: s?.count ?? 0,
      };
    });

    return NextResponse.json(out, { status: 200 });
  } catch (e) {
    console.error("GET /api/posts error:", e);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

/** POST /api/posts */
export async function POST(req) {
  try {
    // ✅ ดึง userId จากคุกกี้ auth (JWT)
    const auth = getAuthUser();
    if (!auth?.userId || !mongoose.Types.ObjectId.isValid(auth.userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      title = "",
      img = "",
      content = "",
      price,
      zones = [],
      activities = [],
      availability = [],   // ⬅️ ใช้ฟิลด์นี้แทน availabilityDays
    } = await req.json();

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

    await connectMongoDB();

    const doc = await Post.create({
      user: auth.userId,
      title: title.trim(),
      img: img.trim(),
      content: content.trim(),
      price: priceNum,
      zones,
      activities,
      availability: normalizeAvailability(availability),
      status: "active",
    });

    return NextResponse.json(
      { message: "สร้างโพสต์สำเร็จ", id: doc._id, user: auth.userId },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/posts error:", err);
    const isValidation = err?.name === "ValidationError" || err?.name === "MongoServerError";
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: isValidation ? 400 : 500 }
    );
  }
}