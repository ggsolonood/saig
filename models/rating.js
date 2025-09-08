import mongoose, { Schema } from "mongoose";

const ratingSchema = new Schema(
  {
    booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    from:    { type: Schema.Types.ObjectId, ref: "User",    required: true, index: true }, // ผู้รีวิว (ต้องเป็น renter)
    to:      { type: Schema.Types.ObjectId, ref: "User",    required: true, index: true }, // ถูกรีวิว (owner)
    stars:   { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { timestamps: true }
);

// ให้คะแนนซ้ำรายการเดิมไม่ได้ (กัน 1 booking/reviewer 1 ครั้ง)
ratingSchema.index({ booking: 1, from: 1 }, { unique: true });
ratingSchema.index({ to: 1, createdAt: -1 });

export default mongoose.models.Rating || mongoose.model("Rating", ratingSchema);
