"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const zoneOptions = ["บางนา", "พระโขนง", "สยาม", "ลาดพร้าว", "รังสิต", "เชียงใหม่", "ขอนแก่น"];
const activityOptions = ["คาเฟ่", "เดินห้าง", "ดูหนัง", "คอนเสิร์ต", "ถ่ายรูป", "เที่ยวทะเล", "เกม", "ทำงานเป็นเพื่อน"];

// helper: แปลงค่า date เป็น "YYYY-MM-DD"
const toYMD = (d) => {
  const dt = typeof d === "string" ? new Date(d) : d instanceof Date ? d : null;
  if (!dt || isNaN(dt.getTime())) return "";
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const da = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
};

export default function EditPostForm({ initial }) {
  const router = useRouter();

  const [title, setTitle] = useState(initial.title);
  const [img, setImg] = useState(initial.img);
  const [content, setContent] = useState(initial.content);
  const [price, setPrice] = useState(String(initial.price || ""));
  const [zones, setZones] = useState(initial.zones || []);
  const [activities, setActivities] = useState(initial.activities || []);
  const [status, setStatus] = useState(initial.status || "active");

  // ✅ ใช้ availability (array ของ object { date }) จาก DB -> state เป็น ["YYYY-MM-DD", ...]
  const [availability, setAvailability] = useState(
    Array.isArray(initial.availability)
      ? Array.from(
          new Set(
            initial.availability
              .map((a) => toYMD(a?.date || a)) // เผื่อกรณีได้แบบ {date} หรือเป็นสตริงก็แปลง
              .filter(Boolean)
          )
        )
      : []
  );

  // ช่องใส่โซนกำหนดเองและวันที่สำหรับเพิ่ม
  const [customZone, setCustomZone] = useState("");
  const [newDate, setNewDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const priceNumber = useMemo(() => {
    const n = Number(price);
    return Number.isFinite(n) ? n : NaN;
  }, [price]);

  const pricePretty = useMemo(() => {
    if (!Number.isFinite(priceNumber)) return "—";
    try {
      return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(priceNumber);
    } catch {
      return `${priceNumber} THB`;
    }
  }, [priceNumber]);

  const toggleFromArray = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const validateUrl = (url) => {
    if (!url) return false;
    try {
      const u = new URL(url);
      return ["http:", "https:"].includes(u.protocol);
    } catch {
      return false;
    }
  };

  const addCustomZone = () => {
    const z = customZone.trim();
    if (!z) return;
    if (!zones.includes(z)) setZones((prev) => [...prev, z]);
    setCustomZone("");
  };

  // ✅ เพิ่ม/ลบวันว่าง (YYYY-MM-DD)
  const addAvailabilityDate = () => {
    const d = (newDate || "").trim();
    if (!d) return;
    // เช็กว่าเป็นรูปแบบ YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
    if (!availability.includes(d)) setAvailability((prev) => [...prev, d].sort());
    setNewDate("");
  };
  const removeAvailabilityDate = (d) => setAvailability((prev) => prev.filter((x) => x !== d));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");

    if (!title.trim() || !img.trim() || !content.trim() || !price.toString().trim()) {
      setErr("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    if (!validateUrl(img)) {
      setErr("URL รูปภาพไม่ถูกต้อง");
      return;
    }
    if (content.trim().length < 10) {
      setErr("เนื้อหาต้องมีอย่างน้อย 10 ตัวอักษร");
      return;
    }
    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
      setErr("กรุณากรอกราคาที่ถูกต้อง");
      return;
    }
    if (zones.length === 0) {
      setErr("กรุณาเลือกหรือเพิ่มโซน/พื้นที่อย่างน้อย 1 รายการ");
      return;
    }
    if (availability.length === 0) {
      setErr("กรุณาเพิ่ม 'วันที่ว่าง' อย่างน้อย 1 วัน");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/posts/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          img: img.trim(),
          content: content.trim(),
          price: priceNumber,
          zones,
          activities,
          // ✅ ส่งรูปแบบใหม่ไปที่ API: ["YYYY-MM-DD", ...]
          availability,
          status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || "อัปเดตไม่สำเร็จ");
        return;
      }
      setOk("บันทึกการแก้ไขสำเร็จ");
      router.push("/mypost");
    } catch {
      setErr("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200/60 p-6 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <Link href="/mypost" className="text-sm text-gray-600 hover:text-gray-900">← กลับไปโพสต์ของฉัน</Link>
        <div className="text-xs text-gray-500">โพสต์ #{initial.id}</div>
      </div>

      {err && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700">{err}</div>}
      {ok &&  <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">{ok}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="text-sm font-semibold text-gray-800">หัวข้อประกาศ</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 w-full bg-white border border-gray-300 rounded-2xl px-4 py-3 focus:border-fuchsia-600 focus:ring-2 focus:ring-fuchsia-300 outline-none"
            placeholder="เช่น เพื่อนเที่ยวคาเฟ่ เสาร์-อาทิตย์ โซนบางนา"
          />
        </div>

        {/* Image */}
        <div>
          <label className="text-sm font-semibold text-gray-800">URL รูปภาพ</label>
          <input
            value={img}
            onChange={(e) => setImg(e.target.value)}
            type="url"
            className="mt-2 w-full bg-white border border-gray-300 rounded-2xl px-4 py-3 focus:border-rose-600 focus:ring-2 focus:ring-rose-300 outline-none"
            placeholder="https://..."
          />
          {img && (
            <div className="mt-3 rounded-2xl overflow-hidden bg-gray-100 p-3">
              <p className="text-xs text-gray-600 mb-2">ตัวอย่างรูปภาพ</p>
              <img src={img} alt="preview" className="w-full aspect-[16/9] object-cover rounded-xl" />
            </div>
          )}
        </div>

        {/* Price */}
        <div>
          <label className="text-sm font-semibold text-gray-800">ราคา (บาทต่อชั่วโมง)</label>
          <div className="mt-2 flex items-center gap-3">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
              className="w-full bg-white border border-gray-300 rounded-2xl px-4 py-3 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-300 outline-none"
              placeholder="เช่น 499"
            />
            <span className="text-sm text-gray-500 min-w-[90px] text-right">{pricePretty}</span>
          </div>
        </div>

        {/* Zones */}
        <div>
          <label className="text-sm font-semibold text-gray-800">โซน/พื้นที่</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {zoneOptions.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZones((prev) => toggleFromArray(prev, z))}
                className={
                  "px-3 py-1.5 rounded-full border text-sm " +
                  (zones.includes(z)
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50")
                }
              >
                {z}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={customZone}
              onChange={(e) => setCustomZone(e.target.value)}
              placeholder="พิมพ์โซนกำหนดเอง เช่น ศรีนครินทร์"
              className="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-2 focus:border-fuchsia-600 focus:ring-2 focus:ring-fuchsia-300 outline-none"
            />
            <button type="button" onClick={addCustomZone} className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800">
              เพิ่ม
            </button>
          </div>
          {zones.length > 0 && <div className="mt-2 text-xs text-gray-600">เลือกแล้ว: {zones.join(", ")}</div>}
        </div>

        {/* Activities */}
        <div>
          <label className="text-sm font-semibold text-gray-800">กิจกรรมที่รับ</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {activityOptions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActivities((prev) => toggleFromArray(prev, t))}
                className={
                  "px-3 py-1.5 rounded-full border text-sm " +
                  (activities.includes(t)
                    ? "bg-gradient-to-r from-fuchsia-600 via-rose-600 to-indigo-600 text-white border-transparent"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50")
                }
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ✅ Availability (วันว่างเป็น “วันที่จริง”) */}
        <div>
          <label className="text-sm font-semibold text-gray-800">วันที่ว่าง</label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="bg-white border border-gray-300 rounded-xl px-3 py-2 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-300 outline-none"
            />
            <button
              type="button"
              onClick={addAvailabilityDate}
              className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800"
            >
              เพิ่มวันว่าง
            </button>
          </div>

          {availability.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {availability.sort().map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 border border-gray-200 text-gray-800"
                >
                  {new Date(d + "T00:00:00Z").toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                  <button
                    type="button"
                    onClick={() => removeAvailabilityDate(d)}
                    className="text-red-600 hover:text-red-800"
                    title="ลบวันนี้ออก"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-xs text-gray-500">ยังไม่เพิ่มวันที่ว่าง</div>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="text-sm font-semibold text-gray-800">สถานะโพสต์</label>
          <div className="mt-2 flex gap-3">
            {["active", "paused"].map((s) => (
              <label key={s} className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="status"
                  value={s}
                  checked={status === s}
                  onChange={(e) => setStatus(e.target.value)}
                />
                {s === "active" ? "แสดงผล" : "พักการแสดงผล"}
              </label>
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="text-sm font-semibold text-gray-800">รายละเอียดประกาศ</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="mt-2 w-full bg-white border border-gray-300 rounded-2xl px-4 py-3 focus:border-violet-600 focus:ring-2 focus:ring-violet-300 outline-none"
            placeholder="รายละเอียดอย่างสุภาพ…"
          />
          <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
            <span>เขียนอย่างน้อย 10 ตัวอักษร</span>
            <span>{content.length} ตัวอักษร</span>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
          </button>
          <Link href={`/posts/${initial.id}`} className="text-sm underline">
            ดูหน้าโพสต์
          </Link>
        </div>
      </form>
    </div>
  );
}
