import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectMongoDB } from "../../../../lib/mongodb";
import { getAuthUser } from "../../../../lib/auth";
import Rating from "../../../../models/rating";
import Booking from "../../../../models/booking";

export const dynamic = "force-dynamic";

/**
 * POST /api/ratings
 * body: { bookingId, stars(1-5), comment? }
 * เงื่อนไข:
 *  - ผู้รีวิวต้องเป็น renter ของ booking นั้น
 *  - booking ต้องอยู่สถานะ completed (ทำรายการเสร็จแล้ว)
 *  - 1 booking ให้คะแนนได้ครั้งเดียวต่อผู้รีวิว
 */
export async function POST(req) {
  try {
    const auth = getAuthUser();
    if (!auth?.userId || !mongoose.Types.ObjectId.isValid(auth.userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId, stars, comment = "" } = await req.json();
    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return NextResponse.json({ error: "bookingId ไม่ถูกต้อง" }, { status: 400 });
    }
    const s = Number(stars);
    if (!Number.isFinite(s) || s < 1 || s > 5) {
      return NextResponse.json({ error: "ให้คะแนน 1–5 ดาวเท่านั้น" }, { status: 400 });
    }

    await connectMongoDB();

    const bk = await Booking.findById(bookingId)
      .select("renter owner status paymentStatus")
      .lean();

    if (!bk) return NextResponse.json({ error: "ไม่พบบุ๊คกิ้ง" }, { status: 404 });
    if (String(bk.renter) !== String(auth.userId)) {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์ให้คะแนนรายการนี้" }, { status: 403 });
    }
    if (bk.status !== "completed") {
      return NextResponse.json({ error: "ให้คะแนนได้เมื่อทำรายการเสร็จสิ้นแล้ว" }, { status: 400 });
    }

    // กันซ้ำ
    const existed = await Rating.findOne({ booking: bookingId, from: auth.userId }).lean();
    if (existed) {
      return NextResponse.json({ error: "คุณให้คะแนนรายการนี้ไปแล้ว" }, { status: 400 });
    }

    const doc = await Rating.create({
      booking: bookingId,
      from: auth.userId,
      to: bk.owner,
      stars: s,
      comment: String(comment || "").trim(),
    });

    return NextResponse.json({ message: "ให้คะแนนสำเร็จ", id: doc._id }, { status: 201 });
  } catch (e) {
    console.error("POST /api/ratings error:", e);
    const dup = e?.code === 11000;
    return NextResponse.json({ error: dup ? "รายการนี้ถูกรีวิวแล้ว" : "Server error" }, { status: dup ? 400 : 500 });
  }
}

/**
 * GET /api/ratings?user=<ownerId>&booking=<bookingId>&limit=20
 * - ถ้าใส่ user: ดึงรีวิวที่ "to=user"
 * - ถ้าใส่ booking: ดึงรีวิวของบุ๊คกิ้งนั้น (มักใช้เช็กว่ารีวิวไปแล้วหรือยัง)
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const user = searchParams.get("user");
    const bookingId = searchParams.get("booking");
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "20", 10)));

    await connectMongoDB();

    const q = {};
    if (user && mongoose.Types.ObjectId.isValid(user)) q.to = user;
    if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) q.booking = bookingId;

    const rows = await Rating.find(q)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("_id booking from to stars comment createdAt")
      .populate({ path: "from", select: "_id username" })
      .lean();

    return NextResponse.json(rows, { status: 200 });
  } catch (e) {
    console.error("GET /api/ratings error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
