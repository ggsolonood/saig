// app/posts/[id]/page.jsx
import Link from "next/link";
import Navbar from "../../components/nav";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { connectMongoDB } from "../../../../lib/mongodb";
import Post from "../../../../models/post";
import { getAuthUser } from "../../../../lib/auth"

export const dynamic = "force-dynamic";

export default async function PostDetailPage({ params }) {
  const { id } = params || {};
  if (!id || !mongoose.Types.ObjectId.isValid(id)) notFound();

  await connectMongoDB();

  // เติมข้อมูลเจ้าของโพสต์เล็กน้อย
  const doc = await Post.findById(id)
    .populate({ path: "user", select: "username name surname" })
    .lean();

  if (!doc) notFound();

  const auth = getAuthUser();
  const isOwner =
    auth?.userId && String(doc.user?._id || doc.user) === String(auth.userId);

  const pricePretty =
    typeof doc.price === "number"
      ? new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(doc.price)
      : "—";

  const dayLabel = (k) =>
    ({ Mon: "จันทร์", Tue: "อังคาร", Wed: "พุธ", Thu: "พฤหัส", Fri: "ศุกร์", Sat: "เสาร์", Sun: "อาทิตย์" }[k]) || k;

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-rose-50 to-indigo-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Breadcrumb / Back */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <span>←</span>
            <span>กลับหน้าหลัก</span>
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
            {doc.title || "โพสต์แฟนเช่า"}
          </h1>

          <div className="shrink-0">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-900 text-white">
              ฿{pricePretty}/ชม.
            </span>
          </div>
        </div>

        {/* by user */}
        <div className="mt-2 text-sm text-gray-600">
          โพสต์โดย{" "}
          <span className="font-medium">
            {doc.user?.username || doc.user?.name || "ผู้ใช้ระบบ"}
          </span>
        </div>

        {/* Cover */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <img
            src={doc.img}
            alt={doc.title || "post image"}
            className="w-full aspect-[16/9] object-cover"
          />
          <div className="p-5">
            {/* Chips */}
            <div className="flex flex-wrap gap-2">
              {(doc.zones || []).map((z) => (
                <span
                  key={`z-${z}`}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-800"
                >
                  โซน: {z}
                </span>
              ))}
              {(doc.activities || []).map((a) => (
                <span
                  key={`a-${a}`}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-fuchsia-600 via-rose-600 to-indigo-600 text-white"
                >
                  {a}
                </span>
              ))}
              {(doc.availabilityDays || []).map((d) => (
                <span
                  key={`d-${d}`}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 border border-gray-200 text-gray-800"
                >
                  {dayLabel(d)}
                </span>
              ))}
            </div>

            {/* Content */}
            <div className="prose max-w-none mt-4 text-gray-800 whitespace-pre-wrap">
              {doc.content}
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {/* ปุ่มจอง: ถ้ายังไม่ล็อกอินส่งไปล็อกอินก่อน */}
              {auth?.userId ? (
                <Link
                  href={`/book?post=${doc._id}`}
                  className="px-5 py-2.5 rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition"
                >
                  จองเลย
                </Link>
              ) : (
                <Link
                  href={`/login?next=${encodeURIComponent(`/book?post=${doc._id}`)}`}
                  className="px-5 py-2.5 rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition"
                >
                  เข้าสู่ระบบเพื่อจอง
                </Link>
              )}

              {/* ปุ่มของเจ้าของโพสต์ */}
              {isOwner && (
                <Link
                  href="/mypost"
                  className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 transition"
                >
                  แก้ไขโพสต์ของฉัน
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// (ไม่บังคับ) ใส่ title ให้สวยขึ้น
export async function generateMetadata({ params }) {
  const { id } = params || {};
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return { title: "โพสต์ไม่พบ" };
  }
  await connectMongoDB();
  const p = await Post.findById(id).select("title").lean();
  return { title: p?.title ? `${p.title} | แฟนเช่า` : "รายละเอียดโพสต์ | แฟนเช่า" };
}
