// app/mypost/[id]/page.jsx
import Navbar from "../../../components/nav";
import { redirect, notFound } from "next/navigation";
import mongoose from "mongoose";
import { connectMongoDB } from "../../../../../lib/mongodb";
import { getAuthUser } from "../../../../../lib/auth";
import Post from "../../../../../models/post";
import EditPostForm from "./EditPostFrom";

export const dynamic = "force-dynamic";

// แปลง Date/ISO → "YYYY-MM-DD"
const toYMD = (d) => {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const da = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
};

export default async function EditMyPostPage({ params }) {
  const { id } = params || {};
  if (!id || !mongoose.Types.ObjectId.isValid(id)) notFound();

  const auth = getAuthUser();
  if (!auth?.userId) redirect(`/login?next=/mypost/${id}`);

  await connectMongoDB();

  const doc = await Post.findById(id).lean();
  if (!doc) notFound();
  if (String(doc.user) !== String(auth.userId)) {
    redirect("/mypost");
  }

  const initial = {
    id: String(doc._id),
    title: doc.title || "",
    img: doc.img || "",
    content: doc.content || "",
    price: typeof doc.price === "number" ? doc.price : 0,
    zones: Array.isArray(doc.zones) ? doc.zones : [],
    activities: Array.isArray(doc.activities) ? doc.activities : [],
    // ✅ ใช้ availability (วันที่จริง) ให้เป็นอาร์เรย์ "YYYY-MM-DD"
    availability: Array.isArray(doc.availability)
      ? Array.from(
          new Set(
            doc.availability
              .map((a) => toYMD(a?.date || a))
              .filter(Boolean)
          )
        )
      : [],
    status: doc.status || "active",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-rose-50 to-indigo-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-fuchsia-600 via-rose-600 to-indigo-600 bg-clip-text text-transparent">
          แก้ไขโพสต์
        </h1>
        <div className="mt-6">
          <EditPostForm initial={initial} />
        </div>
      </div>
    </div>
  );
}
