// app/api/posts/[id]/route.js
import { NextResponse } from "next/server";
import { connectMongoDB } from "../../../../../lib/mongodb";
import Post from "../../../../../models/post";
import Rating from "../../../../../models/rating"; // ⬅ เพิ่ม
import mongoose from "mongoose";
import { getAuthUser } from "../../../../../lib/auth";

export const dynamic = "force-dynamic";

// GET /api/posts/:id
export async function GET(_req, { params }) {
  try {
    const { id } = params || {};
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }
    await connectMongoDB();

    const doc = await Post.findById(id, { __v: 0 }).lean();
    if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });

    // สรุปเรตติ้งของโพสต์นี้
    const sums = await Rating.aggregate([
      { $match: { post: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: "$post",
          avg: { $avg: "$stars" },
          count: { $sum: 1 },
        },
      },
    ]);

    const ratingAvg = sums[0]?.avg ? Number(sums[0].avg) : 0;
    const ratingCount = sums[0]?.count ? Number(sums[0].count) : 0;

    return NextResponse.json({ ...doc, ratingAvg, ratingCount }, { status: 200 });
  } catch (e) {
    console.error("GET /api/posts/:id error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
