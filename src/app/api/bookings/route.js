// app/api/bookings/route.js
import { NextResponse } from "next/server";
import { connectMongoDB } from "../../../../lib/mongodb";
import { getAuthUser } from "../../../../lib/auth";
import mongoose from "mongoose";
import Booking from "../../../../models/booking";
import Post from "../../../../models/post";

export const dynamic = "force-dynamic";

// 🆕 helper: ให้ date เป็นเที่ยงคืน (UTC) ของวันนั้น เพื่อกัน timezone ทำให้ชนกันถูกต้อง
function dateOnlyUTC(d) {
  const z = new Date(d);
  return new Date(Date.UTC(z.getUTCFullYear(), z.getUTCMonth(), z.getUTCDate()));
}

export async function POST(req) {
  try {
    const auth = getAuthUser();
    if (!auth?.userId || !mongoose.Types.ObjectId.isValid(auth.userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const postId = body?.postId || body?.post;
    const { date, hours, notes = "" } = body || {};

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json({ error: "postId ไม่ถูกต้อง" }, { status: 400 });
    }

    const h = Number(hours);
    if (!Number.isFinite(h) || h < 1) {
      return NextResponse.json({ error: "ชั่วโมงต้องเป็นตัวเลขตั้งแต่ 1 ขึ้นไป" }, { status: 400 });
    }

    const d0 = new Date(date);
    if (!date || isNaN(d0.getTime())) {
      return NextResponse.json({ error: "วันที่ไม่ถูกต้อง" }, { status: 400 });
    }
    const d = dateOnlyUTC(d0); // 🆕 normalize วัน

    await connectMongoDB();

    const post = await Post.findById(postId).select("user price title");
    if (!post) {
      return NextResponse.json({ error: "ไม่พบโพสต์ที่ต้องการจอง" }, { status: 404 });
    }

    const ownerId = post.user;
    const pricePerHour = Number(post.price) || 0;

    // ห้ามจองโพสต์ของตัวเอง
    if (String(ownerId) === String(auth.userId)) {
      return NextResponse.json({ error: "ไม่สามารถจองโพสต์ของตัวเองได้" }, { status: 400 });
    }

    // 🆕 กันจองซ้ำ: โพสต์เดียวกัน + วันเดียวกัน มีสถานะใช้งานอยู่แล้ว
    const taken = await Booking.findOne({
      post: post._id,
      date: d,
      status: { $in: ["pending", "confirmed"] },
    });
    if (taken) {
      return NextResponse.json({ error: "มีคนจองแล้วในวันดังกล่าว" }, { status: 409 });
    }

    try {
      const booking = await Booking.create({
        post: post._id,
        owner: ownerId,
        renter: auth.userId,
        date: d,                // 🆕 เก็บเป็นวัน (UTC)
        hours: h,
        pricePerHour,
        totalPrice: pricePerHour * h,
        notes: String(notes || "").trim(),
        status: "pending",
        paymentStatus: "unpaid",
      });

      return NextResponse.json(
        { message: "สร้างการจองสำเร็จ", id: booking._id },
        { status: 201 }
      );
    } catch (e) {
      // 🆕 ถ้ามี unique index ({ post:1, date:1 } หรือแบบ partial) แล้วชน ให้ตอบข้อความไทย
      if (e?.code === 11000 && (e?.keyPattern?.post || e?.keyValue?.post)) {
        return NextResponse.json({ error: "มีคนจองแล้วในวันดังกล่าว" }, { status: 409 });
      }
      throw e;
    }
  } catch (err) {
    console.error("POST /api/bookings error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

export async function GET(req) {
  const auth = await getAuthUser();
  try {
    if (!auth?.userId || !mongoose.Types.ObjectId.isValid(auth.userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = (searchParams.get("role") || "").toLowerCase();
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "20", 10)));

    await connectMongoDB();

    const baseSel =
      "_id post owner renter date hours pricePerHour totalPrice status paymentStatus renterConfirmed ownerConfirmed createdAt";
    const basePopulatePost = { path: "post", select: "_id title img price" };
    const basePopulateUser = { select: "_id username" };

    if (role === "buyer") {
      const rows = await Booking.find({ renter: auth.userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select(baseSel)
        .populate(basePopulatePost)
        .populate({ path: "owner", ...basePopulateUser });
      return NextResponse.json(rows, { status: 200 });
    }

    if (role === "seller") {
      const rows = await Booking.find({ owner: auth.userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select(baseSel)
        .populate(basePopulatePost)
        .populate({ path: "renter", ...basePopulateUser });
      return NextResponse.json(rows, { status: 200 });
    }

    const [asBuyer, asSeller] = await Promise.all([
      Booking.find({ renter: auth.userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select(baseSel)
        .populate(basePopulatePost)
        .populate({ path: "owner", ...basePopulateUser }),
      Booking.find({ owner: auth.userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select(baseSel)
        .populate(basePopulatePost)
        .populate({ path: "renter", ...basePopulateUser }),
    ]);

    const map = new Map();
    [...asBuyer, ...asSeller].forEach((b) => map.set(String(b._id), b));
    const merged = Array.from(map.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    return NextResponse.json(merged, { status: 200 });
  } catch (err) {
    console.error("GET /api/bookings error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
