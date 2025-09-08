// models/post.js
import mongoose, { Schema } from "mongoose";

const availabilitySchema = new Schema(
  {
    date: { type: Date, required: true },
  },
  { _id: false }
);

const postSchema = new Schema(
  {
    user:   { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title:  { type: String, required: true, trim: true },
    content:{ type: String, required: true, trim: true },
    img:    { type: String, required: true, trim: true },
    price:  { type: Number, required: true, min: 0, index: true },

    zones: [{ type: String, trim: true, index: true }],

    activities: [{
      type: String,
      enum: ["คาเฟ่","เดินห้าง","ดูหนัง","คอนเสิร์ต","ถ่ายรูป","เที่ยวทะเล","เกม","ทำงานเป็นเพื่อน"],
      index: true
    }],

    // ✅ แบบใหม่: เก็บเป็นวันที่จริง
    availability: [availabilitySchema],

    status: { type: String, enum: ["active", "paused"], default: "active", index: true }
  },
  { timestamps: true }
);

// ดัชนีเสริม (ไม่บังคับ)
postSchema.index({ "availability.date": 1 });
postSchema.index({ title: "text", content: "text" });

export default mongoose.models.Post || mongoose.model("Post", postSchema);
