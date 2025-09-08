import mongoose, { Schema } from "mongoose";

const bookingSchema = new Schema(
  {
    post:   { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    owner:  { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }, // เจ้าของโพสต์ (ถูกเช่า)
    renter: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }, // ผู้เช่า

    date:        { type: Date,   required: true, index: true },
    hours:       { type: Number, required: true, min: 1 },
    pricePerHour:{ type: Number, required: true, min: 0 },
    totalPrice:  { type: Number, required: true, min: 0 },

    notes:  { type: String, trim: true, default: "" },

    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
      index: true,
    },

    renterConfirmed: { type: Boolean, default: false },
    ownerConfirmed:  { type: Boolean, default: false },
    bothConfirmedAt: { type: Date },
    completedAt:     { type: Date },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "released"],
      default: "unpaid",
      index: true,
    },
    payoutAmount: { type: Number, default: 0 },
    payoutAt:     { type: Date },
  },
  { timestamps: true }
);

// ✅ ทำทุกอย่างใน pre เดียว: กันจองตัวเอง + คำนวณ totalPrice
bookingSchema.pre("validate", function (next) {
  // กันจองโพสต์ของตัวเอง
  if (this.owner && this.renter && String(this.owner) === String(this.renter)) {
    return next(new Error("ไม่สามารถจองโพสต์ของตัวเองได้"));
  }

  // คำนวณราคา (ให้แน่ใจว่า totalPrice พร้อมก่อน validate)
  const h = Number(this.hours);
  const p = Number(this.pricePerHour);
  if (Number.isFinite(h) && Number.isFinite(p)) {
    this.totalPrice = p * h;
  }
  next();
});

// 📌 Indexes ช่วยค้นเร็วและกันจองชนกัน
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ renter: 1, createdAt: -1 });
bookingSchema.index({ owner: 1, createdAt: -1 });
// กันจองซ้ำวันเดียวกันสำหรับโพสต์เดียวกัน (ถ้าไม่ต้องการให้ชนวัน)
bookingSchema.index({ post: 1, date: 1 }, { unique: true });

export default mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
