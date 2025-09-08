// app/create/page.jsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CreatePostPage() {
  const [title, setTitle] = useState("");
  const [img, setImg] = useState("");
  const [content, setContent] = useState("");
  const [price, setPrice] = useState(""); // string for controlled input

  // ใหม่: โซน/กิจกรรม/วัน "ที่ว่างเป็นวัน-เดือน-ปี"
  const zoneOptions = ["บางนา", "พระโขนง", "สยาม", "ลาดพร้าว", "รังสิต", "เชียงใหม่", "ขอนแก่น"];
  const activityOptions = ["คาเฟ่", "เดินห้าง", "ดูหนัง", "คอนเสิร์ต", "ถ่ายรูป", "เที่ยวทะเล", "เกม", "ทำงานเป็นเพื่อน"];

  const [zones, setZones] = useState([]);           // string[]
  const [customZone, setCustomZone] = useState("");
  const [activities, setActivities] = useState([]); // string[]
  const [availability, setAvailability] = useState([]); // ["2025-09-15", "2025-09-22", ...]
  const [dateInput, setDateInput] = useState("");   // ค่าจาก <input type="date">

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const router = useRouter();
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";

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

  const validateUrl = (url) => {
    if (!url) return false;
    try {
      const u = new URL(url);
      return ["http:", "https:"].includes(u.protocol);
    } catch {
      return false;
    }
  };

  const toggleFromArray = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const addCustomZone = () => {
    const z = customZone.trim();
    if (!z) return;
    if (!zones.includes(z)) setZones((prev) => [...prev, z]);
    setCustomZone("");
  };

  // ---- จัดการวันว่างแบบวันที่ ----
  const addDate = () => {
    const d = (dateInput || "").trim(); // รูปแบบจาก <input type="date"> = YYYY-MM-DD
    if (!d) return;
    if (!availability.includes(d)) setAvailability((prev) => [...prev, d]);
    setDateInput("");
  };
  const removeDate = (d) => setAvailability((prev) => prev.filter((x) => x !== d));
  const formatTH = (yyyy_mm_dd) => {
    try {
      const dt = new Date(yyyy_mm_dd);
      if (isNaN(dt.getTime())) return yyyy_mm_dd;
      return dt.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return yyyy_mm_dd;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!title.trim() || !img.trim() || !content.trim() || !price.toString().trim()) {
      setError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    if (!validateUrl(img)) {
      setError("URL รูปภาพไม่ถูกต้อง");
      return;
    }
    if (content.trim().length < 10) {
      setError("เนื้อหาต้องมีอย่างน้อย 10 ตัวอักษร");
      return;
    }
    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
      setError("กรุณากรอกราคาที่ถูกต้อง (ต้องเป็นตัวเลขไม่ติดลบ)");
      return;
    }
    if (zones.length === 0) {
      setError("กรุณาเลือกหรือเพิ่มโซน/พื้นที่อย่างน้อย 1 รายการ");
      return;
    }
    if (availability.length === 0) {
      setError("กรุณาเพิ่มวันว่างอย่างน้อย 1 วัน");
      return;
    }

    const payload = {
      title: title.trim(),
      img: img.trim(),
      content: content.trim(),
      price: priceNumber,
      zones,
      activities,
      // ✅ ส่งเป็น array ของสตริงวันที่ -> API จะ map เป็น { date: Date }
      availability,
    };

    try {
      setLoading(true);
      const res = await fetch(`${base}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      if (!res.ok) {
        let msg = "Failed to create post";
        try {
          const j = JSON.parse(text);
          msg = j?.error || j?.message || msg;
        } catch {}
        throw new Error(msg);
      }

      setSuccess("สร้างประกาศสำเร็จ");
      router.push("/");
    } catch (err) {
      console.error(err);
      setError(err?.message || "เกิดข้อผิดพลาดในการสร้างประกาศ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-rose-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <button className="group flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full transition-all duration-200 hover:shadow-md">
                <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>ย้อนกลับ</span>
              </button>
            </Link>
            <div className="text-sm text-gray-500">สร้างประกาศแฟนเช่า</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-10 grid lg:grid-cols-2 gap-8">
        {/* Left: Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200/60 p-6 md:p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-fuchsia-600 via-rose-600 to-indigo-600 bg-clip-text text-transparent">
              Create New Listing
            </h1>
            <p className="text-gray-600 mt-2">โปรดกรอกข้อมูลให้ครบถ้วนและสุภาพ</p>
          </div>

          {error && <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">{error}</div>}
          {success && <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <svg className="w-5 h-5 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a2 2 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                </svg>
                หัวข้อประกาศ
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                type="text"
                placeholder="เช่น เพื่อนเที่ยวคาเฟ่ เสาร์-อาทิตย์ โซนบางนา"
                className="mt-2 w-full bg-white border border-gray-300 text-gray-900 placeholder:text-gray-600 placeholder:opacity-100 caret-gray-900 focus:border-fuchsia-600 focus:ring-2 focus:ring-fuchsia-300 py-3 px-4 rounded-2xl outline-none"
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                URL รูปภาพ
              </label>
              <input
                value={img}
                onChange={(e) => setImg(e.target.value)}
                type="url"
                placeholder="https://ตัวอย่างโดเมน.com/image.jpg"
                className="mt-2 w-full bg-white border border-gray-300 text-gray-900 placeholder:text-gray-600 placeholder:opacity-100 caret-gray-900 focus:border-rose-600 focus:ring-2 focus:ring-rose-300 py-3 px-4 rounded-2xl outline-none"
              />
              {img && (
                <div className="mt-3 rounded-2xl overflow-hidden bg-gray-100 p-3">
                  <p className="text-xs text-gray-600 mb-2">ตัวอย่างรูปภาพ</p>
                  <img
                    src={img}
                    alt="Preview"
                    className="w-full aspect-[16/9] object-cover rounded-xl"
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.style.display = "none";
                      const fallback = el.nextElementSibling;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                  <div style={{ display: "none" }} className="w-full aspect-[16/9] bg-gray-200 rounded-xl items-center justify-center">
                    <span className="text-gray-500 text-sm">ไม่สามารถโหลดรูปภาพได้</span>
                  </div>
                </div>
              )}
            </div>

            {/* Price */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V4m0 16v-4" />
                </svg>
                ราคา (บาทต่อชั่วโมง)
              </label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                  type="text"
                  inputMode="decimal"
                  placeholder="เช่น 499"
                  className="w-full bg-white border border-gray-300 text-gray-900 placeholder:text-gray-600 placeholder:opacity-100 caret-gray-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-300 py-3 px-4 rounded-2xl outline-none"
                />
                <span className="text-sm text-gray-500 min-w-[90px] text-right">{pricePretty}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                {[299, 399, 499, 699, 999].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrice(String(p))}
                    className="px-3 py-1.5 rounded-full border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    {p.toLocaleString()}฿
                  </button>
                ))}
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
                  className="flex-1 bg-white border border-gray-300 text-gray-900 placeholder:text-gray-600 placeholder:opacity-100 caret-gray-900 focus:border-fuchsia-600 focus:ring-2 focus:ring-fuchsia-300 px-3 py-2 rounded-xl outline-none"
                />
                <button
                  type="button"
                  onClick={addCustomZone}
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800"
                >
                  เพิ่ม
                </button>
              </div>
              {zones.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">เลือกแล้ว: {zones.join(", ")}</div>
              )}
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
              {activities.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">เลือกแล้ว: {activities.join(", ")}</div>
              )}
            </div>

            {/* Availability (วันที่ว่าง) */}
            <div>
              <label className="text-sm font-semibold text-gray-800">วันว่าง (วัน/เดือน/ปี)</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="bg-white border border-gray-300 text-gray-900 caret-gray-900 focus:border-violet-600 focus:ring-2 focus:ring-violet-300 px-3 py-2 rounded-xl outline-none"
                />
                <button
                  type="button"
                  onClick={addDate}
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800"
                >
                  เพิ่มวันว่าง
                </button>
              </div>

              {availability.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {availability.map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200"
                      title={d}
                    >
                      {formatTH(d)}
                      <button
                        type="button"
                        onClick={() => removeDate(d)}
                        className="ml-1 text-gray-500 hover:text-red-600"
                        aria-label="ลบวันว่างนี้"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">
                สามารถเพิ่มหลายวันได้ตามต้องการ (รูปแบบจากปฏิทินจะเป็น YYYY-MM-DD)
              </p>
            </div>

            {/* Content */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                รายละเอียดประกาศ
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder={`ตัวอย่างโครงสร้าง\n• โซน: (เช่น บางนา/พระโขนง)\n• วันว่าง: (เพิ่มด้านบน)\n• กิจกรรม: (คาเฟ่/เดินห้าง/ดูหนัง – ไม่รับงานผิดกฎหมาย)\n• เงื่อนไข: (สุภาพ เคารพกัน จองผ่านแพลตฟอร์มเท่านั้น)`}
                className="mt-2 w-full bg-white border border-gray-300 text-gray-900 placeholder:text-gray-600 placeholder:opacity-100 caret-gray-900 focus:border-violet-600 focus:ring-2 focus:ring-violet-300 py-3 px-4 rounded-2xl outline-none resize-none"
              />
              <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                <span>เขียนอย่างน้อย 10 ตัวอักษร</span>
                <span>{content.length} ตัวอักษร</span>
              </div>
            </div>

            {/* Safety Note */}
            <div className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-2xl p-3">
              โปรดหลีกเลี่ยงการโพสต์เนื้อหาที่ผิดกฎหมายหรือไม่เหมาะสม ใช้ภาษาสุภาพ เคารพสิทธิและความยินยอมของทุกฝ่าย และชำระเงินผ่านระบบที่ปลอดภัยของแพลตฟอร์มเท่านั้น
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-fuchsia-600 via-rose-600 to-indigo-600 hover:from-fuchsia-700 hover:via-rose-700 hover:to-indigo-700 text-white py-3.5 px-6 rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>กำลังสร้างประกาศ…</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>สร้างประกาศ</span>
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Live Preview Card */}
        <div className="lg:sticky lg:top-24">
          <div className="text-sm text-gray-500 mb-3">ตัวอย่างการแสดงผล</div>
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
            <div className="relative">
              <div className="absolute top-3 left-3 z-10">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 border border-gray-200 shadow-sm">
                  {pricePretty === "—" ? "กำหนดราคา" : pricePretty}/ชม.
                </span>
              </div>
              <img
                src={img || "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1200&auto=format&fit=crop"}
                alt="preview"
                className="w-full aspect-[16/9] object-cover"
              />
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{title || "หัวข้อประกาศของคุณ"}</h3>
              <p className="text-gray-600 text-sm mt-1 line-clamp-3">
                {content || "พิมพ์รายละเอียด เช่น โซน/วันว่าง/กิจกรรม และกติกาอย่างสุภาพ"}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                  พร้อมรับงานตามเงื่อนไข
                </div>
                <button type="button" className="px-4 py-2 text-sm rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition">
                  จองเลย
                </button>
              </div>
              {/* แสดงสรุปโซน/วัน/กิจกรรมแบบย่อ */}
              <div className="mt-4 text-xs text-gray-600 space-y-1">
                {zones.length > 0 && <div>โซน: {zones.join(", ")}</div>}
                {availability.length > 0 && (
                  <div>วันว่าง: {availability.map((d) => formatTH(d)).join(", ")}</div>
                )}
                {activities.length > 0 && <div>กิจกรรม: {activities.join(", ")}</div>}
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-6 border border-blue-200/60">
            <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              เคล็ดลับประกาศที่ดูน่าเชื่อถือ
            </h4>
            <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
              <li>ใช้รูปภาพที่ชัดเจน เห็นใบหน้า/การแต่งกายสุภาพ</li>
              <li>ระบุโซน/วันว่าง/กิจกรรมที่รับอย่างชัดเจน</li>
              <li>ไม่รับงานผิดกฎหมาย และต้องเคารพความยินยอม</li>
              <li>สื่อสารผ่านแพลตฟอร์มเท่านั้น เพื่อความปลอดภัยของทั้งสองฝ่าย</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
