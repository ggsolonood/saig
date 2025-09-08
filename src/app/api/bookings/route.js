// app/api/bookings/route.js
import { NextResponse } from "next/server";
import { connectMongoDB } from "../../../../lib/mongodb";
import { getAuthUser } from "../../../../lib/auth";
import mongoose from "mongoose";
import Booking from "../../../../models/booking";
import Post from "../../../../models/post";

export const dynamic = "force-dynamic";

/**
 * POST /api/bookings
 * body: { postId | post, date, hours, notes? }
 * - ใช้ราคา (pricePerHour) จาก Post.price เท่านั้น
 * - owner = Post.user, renter = auth.userId
 */
export async function POST(req) {
  try {
    const auth = getAuthUser();
    if (!auth?.userId || !mongoose.Types.ObjectId.isValid(auth.userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const postId = body?.postId || body?.post; // ✅ รองรับทั้ง postId และ post (จากฟรอนต์เดิม)
    const { date, hours, notes = "" } = body || {};

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json({ error: "postId ไม่ถูกต้อง" }, { status: 400 });
    }

    const h = Number(hours);
    if (!Number.isFinite(h) || h < 1) {
      return NextResponse.json({ error: "ชั่วโมงต้องเป็นตัวเลขตั้งแต่ 1 ขึ้นไป" }, { status: 400 });
    }

    const d = new Date(date);
    if (!date || isNaN(d.getTime())) {
      return NextResponse.json({ error: "วันที่ไม่ถูกต้อง" }, { status: 400 });
    }

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

    const booking = await Booking.create({
      post: post._id,
      owner: ownerId,
      renter: auth.userId,
      date: d,
      hours: h,
      pricePerHour,
      totalPrice: pricePerHour * h, // มี pre-validate คอยคำนวณซ้ำให้อีกชั้น
      notes: String(notes || "").trim(),
      status: "pending",
      paymentStatus: "unpaid",
    });

    return NextResponse.json(
      { message: "สร้างการจองสำเร็จ", id: booking._id },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/bookings error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

/**
 * GET /api/bookings?role=buyer|seller&limit=20
 * - role=buyer  => ที่ผู้ใช้เป็นผู้จอง (renter)
 * - role=seller => ที่ผู้ใช้เป็นเจ้าของโพสต์ (owner)
 * - ?mine=1     => รวมทั้งสองฝั่ง (alias ให้ฟรอนต์เวอร์ชันเก่า)
 * - ไม่ส่ง role/mine => รวมทั้งสองฝั่งเช่นกัน
 */
export async function GET(req) {
  const auth = await getAuthUser(); // ✅ ใช้ตัวเดียว ไม่ประกาศซ้ำ
  try {
    if (!auth?.userId || !mongoose.Types.ObjectId.isValid(auth.userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = (searchParams.get("role") || "").toLowerCase();
    const mine = searchParams.get("mine");
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

    // default / ?mine=1 : รวมสองฝั่ง
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
