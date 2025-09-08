// app/api/bookings/[id]/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAuthUser } from "../../../../../lib/auth";
import { connectMongoDB } from "../../../../../lib/mongodb";
import Booking from "../../../../../models/booking";
import User from "../../../../../models/user";

export async function PATCH(req, { params }) {
  const auth = getAuthUser();

  if (!auth?.userId || !mongoose.Types.ObjectId.isValid(auth.userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = auth.userId; // ใช้ userId ต่อได้เลย
  const id = params.id;

  const { action } = await req.json().catch(() => ({}));
  if (!["confirm", "cancel", "complete"].includes(action)) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  // จากตรงนี้ก็ใช้ userId ได้ เช่น
  // Booking.findOne({ _id: id, owner: userId }

  const bk = await Booking.findById(id)
    .populate("owner", "_id")
    .populate("renter", "_id");
  if (!bk) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (String(bk.owner._id) !== String(user._id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (action === "confirm") {
    if (bk.status !== "pending") {
      return NextResponse.json({ error: "invalid state" }, { status: 400 });
    }
    bk.status = "confirmed";
    bk.ownerConfirmed = true;
    await bk.save();
    return NextResponse.json({ ok: true });
  }

  if (action === "cancel") {
    if (bk.status === "completed" || bk.status === "cancelled") {
      return NextResponse.json({ error: "already final" }, { status: 400 });
    }
    bk.status = "cancelled";
    await bk.save();
    return NextResponse.json({ ok: true });
  }

  // action === "complete"
  if (bk.status !== "confirmed") {
    return NextResponse.json({ error: "invalid state" }, { status: 400 });
  }

  // คำนวณยอดที่จะเข้ากระเป๋า (จะหักค่าธรรมเนียมก็ปรับตรงนี้)
  const amount = Number(bk.totalPrice) || 0;
  const fee = 0; // ตัวอย่าง: ถ้ามีค่าธรรมเนียม 10% => const fee = Math.round(amount * 0.1)
  const credit = amount - fee;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // ปิดงาน
      await Booking.updateOne(
        { _id: bk._id, status: "confirmed" },
        { $set: { status: "completed", completedAt: new Date() } },
        { session }
      );

      // เติมเงินให้เจ้าของโพสต์
      await User.updateOne(
        { _id: bk.owner._id },
        { $inc: { balance: credit } },        // ต้องมี field balance ใน user
        { session }
      );
    });

    return NextResponse.json({ ok: true, amountCredited: credit });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  } finally {
    session.endSession();
  }
}
