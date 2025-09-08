// app/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "./components/nav";
import PostCard from "./components/PostCard";

export default function HomePage() {
  const [me, setMe] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ฟิลเตอร์หน้าเว็บแฟนเช่า
  const [q, setQ] = useState("");         // คำค้น (หัวข้อ/รายละเอียด)
  const [zone, setZone] = useState("");   // โซน/พื้นที่ (ข้อความเทียบกับ zones[])
  const [min, setMin] = useState("");     // ราคาเริ่ม
  const [max, setMax] = useState("");     // ราคาสูงสุด
  const [tags, setTags] = useState([]);   // กิจกรรมที่สนใจ เทียบกับ activities[]

  // ⏰ ฟิลเตอร์ช่วงเวลาที่อยากจอง
  const [wantDate, setWantDate] = useState("");   // YYYY-MM-DD
  const [wantFrom, setWantFrom] = useState("");   // HH:MM
  const [wantTo, setWantTo] = useState("");       // HH:MM

  const tagOptions = ["คาเฟ่", "เดินห้าง", "ดูหนัง", "คอนเสิร์ต", "ถ่ายรูป", "เที่ยวทะเล", "เกม", "ทำงานเป็นเพื่อน"];

  // เช็กสถานะล็อกอิน
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        const d = await r.json().catch(() => ({}));
        if (!ignore) setMe(d?.user || null);
      } finally {
        if (!ignore) setAuthLoading(false);
      }
    })();
    return () => (ignore = true);
  }, []);

  // โหลดโพสต์
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/posts?limit=50`, {
          cache: "no-store",
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

        const data = await res.json();
        const arr = Array.isArray(data) ? data : data.posts || [];

        const toDateOnly = (val) => {
          try {
            const d = new Date(val);
            if (isNaN(d.getTime())) return String(val).slice(0, 10);
            // ใช้ toISOString() เพื่อ normalize timezone -> YYYY-MM-DD
            return d.toISOString().slice(0, 10);
          } catch {
            return String(val).slice(0, 10);
          }
        };

        const mapped = arr.map((p) => ({
          id: p._id || p.id,
          title: p.title ?? "",
          img: p.img ?? "",
          content: p.content ?? "",
          price: typeof p.price === "number" ? p.price : Number(p.price ?? 0),
          zones: Array.isArray(p.zones) ? p.zones : [],
          activities: Array.isArray(p.activities) ? p.activities : [],
          availability: Array.isArray(p.availability)
            ? p.availability.map((a) => ({
                date: a?.date ? toDateOnly(a.date) : null,
                from: a?.from || null,
                to: a?.to || null,
              }))
            : [],
            ratingAvg: Number(p.ratingAvg || 0),
            ratingCount: Number(p.ratingCount || 0),
        }));
        setPosts(mapped);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error(e);
          setError("โหลดโพสต์ไม่สำเร็จ");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  // helper toggle ชิป
  const toggleIn = (list, value) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  // ----- ตัวช่วยเปรียบเทียบเวลา -----
  const asHM = (t, fallback) => {
    // คืน HH:MM (24h) ถ้ากรอกไม่ครบให้ fallback
    if (!t) return fallback;
    const m = /^([0-1]\d|2[0-3]):([0-5]\d)$/.exec(t);
    if (!m) return fallback;
    return t;
  };
  const less = (a, b) => a < b;        // string HH:MM เทียบ lexicographic ได้
  const overlap = (sF, sT, wF, wT) => {
    // มีช่วงซ้อนทับถ้า max(start) < min(end)
    const start = sF > wF ? sF : wF;
    const end = sT < wT ? sT : wT;
    return start < end;
  };

  // ฟิลเตอร์บน client
  const filtered = useMemo(() => {
    // เตรียมค่าช่วงเวลาที่อยากจอง
    const wantDateOnly = (wantDate || "").trim();
    const wantFromHM = asHM(wantFrom, "00:00");
    const wantToHM = asHM(wantTo, "23:59");

    return posts.filter((p) => {
      const text = `${p.title} ${p.content}`.toLowerCase();

      // คำค้นตามข้อความ
      const okQ = q ? text.includes(q.toLowerCase()) : true;

      // โซน: ดูทั้งใน zones[] และข้อความ (กันกรณีเจ้าของพิมพ์ไว้ใน content)
      const okZone = zone
        ? (Array.isArray(p.zones) && p.zones.some((z) => String(z).toLowerCase().includes(zone.toLowerCase())))
            || text.includes(zone.toLowerCase())
        : true;

      // ราคา
      const okMin = min ? Number(p.price) >= Number(min) : true;
      const okMax = max ? Number(p.price) <= Number(max) : true;

      // กิจกรรม: ถ้าเลือกหลายอัน ให้ผ่านถ้า “มีอย่างน้อยหนึ่งอัน” ตรงกับ activities[]
      const okTags =
        tags.length === 0
          ? true
          : (Array.isArray(p.activities) && tags.some((t) => p.activities.includes(t)))
            || tags.some((t) => text.includes(t.toLowerCase()));

      // เวลา/วันที่อยากจอง:
      // - ถ้าไม่เลือกวันเลย -> ผ่าน
      // - ถ้าเลือกวัน -> ต้องมี slot ใน availability ที่วันตรง
      //   - ถ้าไม่ได้เลือกเวลา -> ผ่าน (ทั้งวัน)
      //   - ถ้าเลือกเวลา -> ต้องซ้อนทับกับช่วงเวลาของ slot
      let okTime = true;
      if (wantDateOnly) {
        const slots = Array.isArray(p.availability) ? p.availability : [];
        okTime = slots.some((s) => {
          if (!s?.date) return false;
          if (String(s.date) !== wantDateOnly) return false;

          const slotFrom = asHM(s.from, "00:00");
          const slotTo = asHM(s.to, "23:59");

          // ถ้าผู้ใช้ไม่ได้เลือกเวลาใด ๆ ให้ถือว่าโอเคเพราะวันตรง
          if (!wantFrom && !wantTo) return true;

          // ถ้าเลือกเวลา → ต้อง overlap
          return overlap(slotFrom, slotTo, wantFromHM, wantToHM);
        });
      }

      return okQ && okZone && okMin && okMax && okTags && okTime;
    });
  }, [posts, q, zone, min, max, tags, wantDate, wantFrom, wantTo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-rose-50 to-indigo-50">
      <Navbar />

      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-200/20 via-rose-200/20 to-indigo-200/20" />
        <div className="relative max-w-6xl mx-auto px-6 py-10 md:py-14">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-fuchsia-600 via-rose-600 to-indigo-600 bg-clip-text text-transparent">
                หาแฟนเช่าไปคาเฟ่/ดูหนัง สร้างโมเมนต์ดี ๆ ได้ทุกวัน
              </h1>
              <p className="mt-3 text-gray-600 md:text-lg">
                เลือกคนรู้ใจตามงบและเวลา — โพสต์สุภาพ ปลอดภัย จองผ่านแพลตฟอร์มเท่านั้น
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3 justify-center md:justify-start">
                {!authLoading && (me ? (
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
                ))}
              </div>
            </div>

            {/* กล่องตัวอย่างรูปแบบแฟนเช่า */}
            <div className="flex-1 w-full">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-5">
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200"
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  ตัวอย่างเลเอาต์ภาพ — โพสต์จริงอยู่ด้านล่าง
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5">
          <div className="grid md:grid-cols-4 gap-4">
            {/* คำค้น */}
            <div className="col-span-2 md:col-span-1">
              <label className="text-sm font-semibold text-gray-800">คำค้น</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="เช่น คาเฟ่ บางนา ดูหนัง"
                className="mt-2 w-full bg-white border border-gray-300 text-gray-900 placeholder:text-gray-600 placeholder:opacity-100 caret-gray-900 focus:border-fuchsia-600 focus:ring-2 focus:ring-fuchsia-300 rounded-xl px-3 py-2 outline-none"
              />
            </div>

            {/* โซน */}
            <div className="col-span-2 md:col-span-1">
              <label className="text-sm font-semibold text-gray-800">โซน/พื้นที่</label>
              <input
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="เช่น บางนา, พระโขนง, สยาม"
                className="mt-2 w-full bg-white border border-gray-300 text-gray-900 placeholder:text-gray-600 placeholder:opacity-100 caret-gray-900 focus:border-rose-600 focus:ring-2 focus:ring-rose-300 rounded-xl px-3 py-2 outline-none"
              />
            </div>

            {/* ราคา */}
            <div className="grid grid-cols-2 gap-3 md:col-span-2">
              <div>
                <label className="text-sm font-semibold text-gray-800">ราคาเริ่ม (฿/ชม.)</label>
                <input
                  value={min}
                  onChange={(e) => setMin(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="เช่น 300"
                  className="mt-2 w-full bg-white border border-gray-300 text-gray-900 placeholder:text-gray-600 placeholder:opacity-100 caret-gray-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-300 rounded-xl px-3 py-2 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-800">ราคาสูงสุด (฿/ชม.)</label>
                <input
                  value={max}
                  onChange={(e) => setMax(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="เช่น 800"
                  className="mt-2 w-full bg-white border border-gray-300 text-gray-900 placeholder:text-gray-600 placeholder:opacity-100 caret-gray-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-300 rounded-xl px-3 py-2 outline-none"
                />
              </div>
            </div>
          </div>

          {/* วัน/เวลา ที่อยากจอง + กิจกรรม */}
          <div className="mt-4 grid md:grid-cols-2 gap-4">
            {/* วันที่ & ช่วงเวลา */}
            <div>
              <div className="text-sm font-semibold text-gray-800 mb-2">ช่วงเวลาที่อยากจอง</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-600">วันที่</label>
                  <input
                    type="date"
                    value={wantDate}
                    onChange={(e) => setWantDate(e.target.value)}
                    className="mt-1 w-full bg-white border border-gray-300 rounded-xl px-3 py-2 outline-none focus:border-fuchsia-600 focus:ring-2 focus:ring-fuchsia-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">ตั้งแต่เวลา</label>
                  <input
                    type="time"
                    value={wantFrom}
                    onChange={(e) => setWantFrom(e.target.value)}
                    className="mt-1 w-full bg-white border border-gray-300 rounded-xl px-3 py-2 outline-none focus:border-fuchsia-600 focus:ring-2 focus:ring-fuchsia-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">ถึงเวลา</label>
                  <input
                    type="time"
                    value={wantTo}
                    onChange={(e) => setWantTo(e.target.value)}
                    className="mt-1 w-full bg-white border border-gray-300 rounded-xl px-3 py-2 outline-none focus:border-fuchsia-600 focus:ring-2 focus:ring-fuchsia-300"
                  />
                </div>
              </div>
            </div>

            {/* กิจกรรม */}
            <div>
              <div className="text-sm font-semibold text-gray-800 mb-2">กิจกรรม</div>
              <div className="flex flex-wrap gap-2">
                {tagOptions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTags((prev) => toggleIn(prev, t))}
                    className={
                      "px-3 py-1.5 rounded-full border text-sm " +
                      (tags.includes(t)
                        ? "bg-gradient-to-r from-fuchsia-600 via-rose-600 to-indigo-600 text-white border-transparent"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50")
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ปุ่มล้างฟิลเตอร์ */}
          {(q || zone || min || max || tags.length || wantDate || wantFrom || wantTo) ? (
            <div className="mt-4">
              <button
                onClick={() => {
                  setQ("");
                  setZone("");
                  setMin("");
                  setMax("");
                  setTags([]);
                  setWantDate("");
                  setWantFrom("");
                  setWantTo("");
                }}
                className="text-sm text-gray-600 underline hover:text-gray-900"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {/* POSTS */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold">โพสต์แฟนเช่าล่าสุด</h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden animate-pulse">
                <div className="w-full aspect-[16/9] bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500">
            ไม่พบโพสต์ที่ตรงกับเงื่อนไข
            <div className="mt-2">
              {!authLoading && (me ? (
                <Link href="/create" className="underline">สร้างประกาศ</Link>
              ) : (
                <Link href="/login?next=/create" className="underline">เข้าสู่ระบบ</Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => (
              <PostCard key={p.id} {...p} />
            ))}
          </div>
        )}
      </main>

      {/* SAFETY NOTE */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-6 border border-blue-200/60">
          <h3 className="text-base font-semibold text-gray-800 mb-2">คำแนะนำด้านความปลอดภัย</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
            <li>สื่อสาร/ชำระเงินผ่านแพลตฟอร์มเท่านั้น</li>
            <li>ระบุขอบเขต/กิจกรรมให้ชัดเจน และเคารพความยินยอม</li>
            <li>หลีกเลี่ยงการแลกข้อมูลส่วนตัวที่อ่อนไหว</li>
          </ul>
        </div>
      </section>

      {/* FAB สร้างประกาศ (มือถือ) */}
      {!authLoading && (me ? (
        <Link
          href="/create"
          className="fixed bottom-5 right-5 md:hidden px-4 py-3 rounded-full shadow-lg bg-gradient-to-r from-fuchsia-600 via-rose-600 to-indigo-600 text-white"
        >
          + สร้างประกาศ
        </Link>
      ) : (
        <Link
          href="/login?next=/create"
          className="fixed bottom-5 right-5 md:hidden px-4 py-3 rounded-full shadow-lg bg-gray-200 text-gray-700"
          title="ต้องเข้าสู่ระบบก่อนจึงจะสร้างประกาศได้"
        >
          + เข้าสู่ระบบ
        </Link>
      ))}
    </div>
  );
}
