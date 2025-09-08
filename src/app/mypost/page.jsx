// app/mypost/page.jsx
import Link from "next/link";
import Navbar from "../components/nav";
import { redirect } from "next/navigation";
import { getAuthUser } from "../../../lib/auth";
import { connectMongoDB } from "../../../lib/mongodb";
import Post from "../../../models/post";

export const dynamic = "force-dynamic";

function formatTHB(n) {
  try {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 0,
    }).format(Number(n || 0));
  } catch {
    return `฿${Number(n || 0).toLocaleString()}`;
  }
}

export default async function MyPostPage() {
  // ✅ ต้องล็อกอินก่อน
  const auth = getAuthUser();
  if (!auth?.userId) redirect("/login?next=/mypost");

  // ✅ ดึงโพสต์ที่สร้างโดย user นี้
  await connectMongoDB();
  const docs = await Post.find({ user: auth.userId }, { __v: 0 })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-rose-50 to-indigo-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-fuchsia-600 via-rose-600 to-indigo-600 bg-clip-text text-transparent">
            โพสต์ของฉัน
          </h1>
          <Link
            href="/create"
            className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800"
          >
            + สร้างประกาศ
          </Link>
        </div>

        {/* สรุป */}
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="text-sm text-gray-500">จำนวนโพสต์</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{docs.length}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="text-sm text-gray-500">ราคาต่ำสุด</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">
              {docs.length ? formatTHB(Math.min(...docs.map((d) => d.price || 0))) : "—"}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="text-sm text-gray-500">ราคาสูงสุด</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">
              {docs.length ? formatTHB(Math.max(...docs.map((d) => d.price || 0))) : "—"}
            </div>
          </div>
        </div>

        {/* รายการโพสต์ */}
        <div className="mt-6">
          {docs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center text-gray-600">
              ยังไม่มีโพสต์ — เริ่มสร้างประกาศแรกของคุณที่{" "}
              <Link href="/create" className="underline">
                สร้างประกาศ
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {docs.map((p) => (
                <li key={p._id} className="group bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-xl hover:border-gray-300 transition-all duration-300">
                  {/* รูป */}
                  <div className="relative w-full aspect-[16/9] overflow-hidden">
                    {p.img ? (
                      <img
                        src={p.img}
                        alt={p.title || "post"}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-fuchsia-100 via-rose-100 to-indigo-100">
                        <span className="text-xl font-bold text-gray-600">—</span>
                      </div>
                    )}

                    {/* ราคา & โซนแรก */}
                    <div className="absolute left-3 top-3">
                      <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-900 text-white shadow">
                        {formatTHB(p.price)}/ชม.
                      </span>
                    </div>
                    {p.zones?.[0] ? (
                      <div className="absolute right-3 top-3">
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/90 text-gray-800 border border-gray-200 backdrop-blur">
                          {p.zones[0]}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* เนื้อหา */}
                  <div className="p-4">
                    <h3 className="text-base font-extrabold line-clamp-2 min-h-[2.8rem]">
                      {p.title || "โพสต์ไม่มีชื่อ"}
                    </h3>
                    <p className="mt-1.5 text-sm text-gray-600 line-clamp-2 min-h-[2.25rem]">
                      {(p.content || "").slice(0, 90)}{(p.content || "").length > 90 ? "…" : ""}
                    </p>

                    {/* ปุ่ม */}
                    <div className="mt-4 flex items-center justify-between">
                      <Link
                        href={`/posts/${p._id}`}
                        className="text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                      >
                        ดูรายละเอียด →
                      </Link>
                      <div className="flex items-center gap-2">
    <Link
      href={`/mypost/edit/${p._id}`}
      className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50"
    >
      แก้ไข
    </Link>
    </div>
                      
                      {/* ปุ่มอื่น ๆ (เผื่อจะทำต่อภายหลัง) */}
                      <div className="flex items-center gap-2">
                        {/* <Link href={`/mypost/edit/${p._id}`} className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50">แก้ไข</Link> */}
                        {/* <button className="px-3 py-1.5 rounded-lg border text-xs text-rose-600 hover:bg-rose-50">ลบ</button> */}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
