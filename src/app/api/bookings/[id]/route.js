import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectMongoDB } from "../../../../../lib/mongodb";
import { getAuthUser } from "../../../../../lib/auth";
import Booking from "../../../../../models/booking";

export const dynamic = "force-dynamic";

// (ออปชัน) ดึงทีละอัน
export async function GET(_req, { params }) {
  try {
    const { id } = params || {};
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }
    await connectMongoDB();
    const b = await Booking.findById(id)
      .populate({ path: "post", select: "_id title img price" })
      .populate({ path: "owner", select: "_id username" })
      .populate({ path: "renter", select: "_id username" })
      .lean();
    if (!b) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(b, { status: 200 });
  } catch (e) {
    console.error("GET /api/bookings/:id error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/bookings/:id
 * body: { action: "confirm" | "cancel" }
 * - confirm: ใครกดก็จะติ๊กฝั่งตนเอง (owner/renter) เป็น true
 *   ถ้าครบสองฝั่ง → ปล่อยเงิน + completed
 * - cancel: ใครก็กดยกเลิกได้ (ยังไม่อนุมัติ) → cancelled
 */
export async function PATCH(req, { params }) {
  try {
    const auth = getAuthUser(); // ใช้แบบเดิมตามโปรเจ็กต์คุณ
    if (!auth?.userId || !mongoose.Types.ObjectId.isValid(auth.userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params || {};
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const { action } = await req.json().catch(() => ({}));
    if (!action) {
      return NextResponse.json({ error: "missing action" }, { status: 400 });
    }

    await connectMongoDB();
    const b = await Booking.findById(id);
    if (!b) return NextResponse.json({ error: "not found" }, { status: 404 });

    const isOwner  = String(b.owner)  === String(auth.userId);
    const isRenter = String(b.renter) === String(auth.userId);
    if (!isOwner && !isRenter) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // ป้องกันแก้จองที่ปิดไปแล้ว
    if (["completed", "cancelled"].includes(b.status)) {
      return NextResponse.json({ error: "booking already closed" }, { status: 400 });
    }

    if (action === "cancel") {
      b.status = "cancelled";
      b.paymentStatus = "unpaid";
      await b.save();
      return NextResponse.json({ ok: true, booking: { id: b._id, status: b.status } }, { status: 200 });
    }

    if (action === "confirm") {
      if (isOwner)  b.ownerConfirmed  = true;
      if (isRenter) b.renterConfirmed = true;

      // ถ้าครบสองฝั่ง → ปล่อยเงิน + ปิดงาน
      if (b.ownerConfirmed && b.renterConfirmed && !b.bothConfirmedAt) {
        const now = new Date();
        b.bothConfirmedAt = now;

        b.paymentStatus = "released";
        b.payoutAmount  = b.totalPrice;
        b.payoutAt      = now;

        b.status      = "completed";
        b.completedAt = now;
      }

      await b.save();
      return NextResponse.json({
        ok: true,
        booking: {
          id: b._id,
          status: b.status,
          renterConfirmed: b.renterConfirmed,
          ownerConfirmed: b.ownerConfirmed,
          bothConfirmedAt: b.bothConfirmedAt,
          paymentStatus: b.paymentStatus,
          payoutAmount: b.payoutAmount,
          payoutAt: b.payoutAt,
        }
      }, { status: 200 });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    console.error("PATCH /api/bookings/:id error:", e);
    const isValidation = e?.name === "ValidationError" || e?.name === "MongoServerError";
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: isValidation ? 400 : 500 }
    );
  }
}
