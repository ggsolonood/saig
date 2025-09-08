// app/profile/page.jsx
import Link from "next/link";
import Navbar from "../components/nav";
import { redirect } from "next/navigation";
import { getAuthUser } from "../../../lib/auth";
import { connectMongoDB } from "../../../lib/mongodb";
import User from "../../../models/user";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  // ตรวจสิทธิ์จากคุกกี้ JWT (ฝั่งเซิร์ฟเวอร์)
  const auth = getAuthUser();
  if (!auth?.userId) {
    redirect("/login?next=/profile");
  }

  await connectMongoDB();
  const doc = await User.findById(auth.userId)
    .select("name surname income username email role")
    .lean();

  const name = doc?.name ?? "";
  const surname = doc?.surname ?? "";
  const income =
    typeof doc?.income === "number" ? doc.income : null;

  const incomePretty =
    income !== null
      ? new Intl.NumberFormat("th-TH", {
          style: "currency",
          currency: "THB",
          maximumFractionDigits: 0,
        }).format(income)
      : "—";

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-rose-50 to-indigo-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-fuchsia-600 via-rose-600 to-indigo-600 bg-clip-text text-transparent">
          โปรไฟล์ของฉัน
        </h1>

        {/* การ์ดข้อมูลผู้ใช้ */}
        <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200/60 p-6 md:p-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-500">ชื่อ</div>
              <div className="text-lg font-semibold text-gray-900">
                {name || "—"}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">นามสกุล</div>
              <div className="text-lg font-semibold text-gray-900">
                {surname || "—"}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">รายได้ (Income)</div>
              <div className="text-lg font-semibold text-gray-900">
                {incomePretty}
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <div>Username: <span className="font-medium">{doc?.username ?? "—"}</span></div>
              <div>Email: <span className="font-medium">{doc?.email ?? "—"}</span></div>
              <div>Role: <span className="font-medium">{doc?.role ?? "user"}</span></div>
            </div>
          </div>
        </div>

        {/* ปุ่มลิงก์ไปหน้าอื่น ๆ */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          <Link
            href="/book"
            className="group block bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">ไปยัง</div>
                <div className="text-lg font-bold text-gray-900">การจอง (Book)</div>
              </div>
              <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              จัดการ/ดูการจองของคุณ
            </p>
          </Link>

          <Link
            href="/mypost"
            className="group block bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">ไปยัง</div>
                <div className="text-lg font-bold text-gray-900">โพสต์ของฉัน (My Post)</div>
              </div>
              <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              ดู/แก้ไขประกาศที่คุณสร้าง
            </p>
          </Link>

          <Link
            href="/reserved"
            className="group block bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">ไปยัง</div>
                <div className="text-lg font-bold text-gray-900">ที่จองไว้ (Reserved)</div>
              </div>
              <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              รายการที่คุณได้ทำการจองไว้
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
