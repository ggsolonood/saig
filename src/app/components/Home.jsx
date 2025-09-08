// components/Home.jsx
import Link from "next/link";
import PostCard from "./PostCard";
import { getAuthUser } from "../lib/auth"; // ← ปรับ path ให้ตรงโปรเจกต์

export default function Home({ posts = [] }) {
  // อ่านคุกกี้ auth (JWT) ฝั่งเซิร์ฟเวอร์ แล้วเช็กว่ามี userId ไหม
  const auth = getAuthUser();
  const isLoggedIn = !!auth?.userId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-rose-50 to-indigo-50">
      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-200/20 via-rose-200/20 to-indigo-200/20" />
        <div className="relative max-w-6xl mx-auto px-6 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-fuchsia-600 via-rose-600 to-indigo-600 bg-clip-text text-transparent">
                แฟนเช่าใกล้คุณ • สร้างโมเมนต์ดี ๆ ได้ทุกวัน
              </h1>
              <p className="mt-3 text-gray-600 md:text-lg">
                เลือกคนรู้ใจไปคาเฟ่ ดูหนัง เดินห้าง ในเวลาที่คุณสะดวก
                โพสต์สุภาพ ปลอดภัย และจองผ่านแพลตฟอร์มเท่านั้น
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3 justify-center md:justify-start">
                <Link
                  href="/posts"
                  className="px-5 py-3 rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition"
                >
                  ดูทั้งหมด →
                </Link>

                {isLoggedIn ? (
                  <Link
                    href="/create"
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 via-rose-600 to-indigo-600 text-white hover:from-fuchsia-700 hover:via-rose-700 hover:to-indigo-700 transition"
                  >
                    สร้างประกาศ
                  </Link>
                ) : (
                  <Link
                    href="/login?next=/create"
                    className="px-5 py-3 rounded-xl bg-gray-200 text-gray-600 hover:bg-gray-300 transition"
                    title="ต้องเข้าสู่ระบบก่อนจึงจะสร้างประกาศได้"
                  >
                    เข้าสู่ระบบเพื่อสร้างประกาศ
                  </Link>
                )}
              </div>
            </div>

            <div className="flex-1 w-full">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-5">
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200" />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  ตัวอย่างเลเอาต์ภาพ — โพสต์จริงจะแสดงด้านล่าง
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Posts */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl md:text-2xl font-extrabold">โพสต์แฟนเช่าล่าสุด</h2>
          <Link
            href="/posts"
            className="text-sm font-semibold text-indigo-700 hover:text-indigo-900"
          >
            ดูทั้งหมด →
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center text-gray-500">
            ยังไม่มีโพสต์ — เริ่มก่อนใครได้ที่{" "}
            {isLoggedIn ? (
              <Link href="/create" className="underline">สร้างประกาศ</Link>
            ) : (
              <Link href="/login?next=/create" className="underline">เข้าสู่ระบบ</Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.slice(0, 6).map((p) => (
              <PostCard
                key={p._id || p.id}
                id={p._id || p.id}
                title={p.title}
                img={p.img}
                content={p.content}
                price={p.price}
              />
            ))}
          </div>
        )}
      </section>

      {/* Safety */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-6 border border-blue-200/60">
          <h3 className="text-base font-semibold text-gray-800 mb-2">คำแนะนำด้านความปลอดภัย</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
            <li>สื่อสารและชำระเงินผ่านแพลตฟอร์มเท่านั้น</li>
            <li>ระบุขอบเขต/กิจกรรมที่ชัดเจน เคารพความยินยอม</li>
            <li>หลีกเลี่ยงการแลกเปลี่ยนข้อมูลส่วนตัวที่อ่อนไหว</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
