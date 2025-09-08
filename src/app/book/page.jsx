// app/book/page.jsx
"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/nav";

const isHex24 = (s) => /^[a-f0-9]{24}$/i.test(String(s || "").trim());

function normalizeYear(y) {
  if (!Number.isFinite(y)) return null;
  if (y >= 2400) y -= 543;
  if (y < 1900 || y > 2100) return null;
  return y;
}
function dateOnlyFromYMDUTC(y, m, d) {
  y = normalizeYear(Number(y)); m = Number(m); d = Number(d);
  if (!y || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}
function toDateOnlyUTCStr(dt) { return dt.toISOString().slice(0,10); }
function parseAnyDateToYMD(slot) {
  if (slot == null) return null;
  if (typeof slot === "object" && "$date" in slot && typeof slot.$date === "string") {
    const dt = new Date(slot.$date);
    if (!Number.isNaN(dt.getTime())) return { y: dt.getUTCFullYear(), m: dt.getUTCMonth()+1, d: dt.getUTCDate() };
    return null;
  }
  if (typeof slot === "string") {
    const m = slot.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return { y:+m[1], m:+m[2], d:+m[3] };
    const dt = new Date(slot);
    if (!Number.isNaN(dt.getTime())) return { y: dt.getUTCFullYear(), m: dt.getUTCMonth()+1, d: dt.getUTCDate() };
    return null;
  }
  if (typeof slot === "number" && Number.isFinite(slot)) {
    const dt = new Date(slot);
    if (!Number.isNaN(dt.getTime())) return { y: dt.getUTCFullYear(), m: dt.getUTCMonth()+1, d: dt.getUTCDate() };
    return null;
  }
  if (slot instanceof Date) {
    if (!Number.isNaN(slot.getTime())) return { y: slot.getUTCFullYear(), m: slot.getUTCMonth()+1, d: slot.getUTCDate() };
    return null;
  }
  if (typeof slot === "object") {
    const s = slot.date ? slot.date : slot;
    if (s && typeof s === "object" && "$date" in s) return parseAnyDateToYMD(s);
    const y = s.year ?? s.y, m = s.month ?? s.m, d = s.day ?? s.d;
    if (y != null && m != null && d != null) return { y:+y, m:+m, d:+d };
  }
  return null;
}
function slotToDateOnlyStr(slot) {
  const ymd = parseAnyDateToYMD(slot);
  if (!ymd) return null;
  const dt = dateOnlyFromYMDUTC(ymd.y, ymd.m, ymd.d);
  return dt ? toDateOnlyUTCStr(dt) : null;
}
function expandRangeToListStr(slot, maxDays = 366) {
  if (!slot?.from || !slot?.to) return [];
  const a = slotToDateOnlyStr(slot.from), b = slotToDateOnlyStr(slot.to);
  if (!a || !b) return [];
  let cur = a; const out = []; let guard = 0;
  while (cur <= b && guard < maxDays) {
    out.push(cur);
    const [yy, mm, dd] = cur.split("-").map(Number);
    cur = toDateOnlyUTCStr(new Date(Date.UTC(yy, mm - 1, dd + 1)));
    guard++;
  }
  return out;
}
function buildAllowedDates(post) {
  const slots = Array.isArray(post?.availability) ? post.availability : [];
  if (slots.length === 0) return [];
  const set = new Set();
  for (const s of slots) {
    const one = slotToDateOnlyStr(s?.date ?? s);
    if (one) { set.add(one); continue; }
    for (const d of expandRangeToListStr(s)) set.add(d);
  }
  return Array.from(set).sort();
}

export default function BookPageWrapper() {
  return (
    <Suspense fallback={<div className="p-6">กำลังโหลด…</div>}>
      <BookPage />
    </Suspense>
  );
}

function BookPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const postId = sp.get("post");

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState(null);
  const [err, setErr] = useState("");

  const [date, setDate] = useState("");
  const [hours, setHours] = useState("2");
  const [note, setNote] = useState("");

  const [allowedDates, setAllowedDates] = useState([]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const meData = await meRes.json().catch(() => ({}));
        if (!ignore) setMe(meData?.user || null);

        if (!meData?.user) {
          const next = postId ? `/book?post=${postId}` : "/book";
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }

        if (postId && isHex24(postId)) {
          const pRes = await fetch(`/api/posts/${postId}`, { cache: "no-store" });
          if (!pRes.ok) throw new Error("ไม่พบโพสต์ที่ต้องการจอง");
          const p = await pRes.json();
          if (!ignore) setPost(p);

          if (p?.user && meData.user?.id && String(p.user) === String(meData.user.id)) {
            setErr("ไม่สามารถจองโพสต์ของตัวเองได้");
          }

          const list = buildAllowedDates(p);
          if (!ignore) {
            setAllowedDates(list);
            if (list.length > 0) setDate((d) => d || list[0]);
          }
        } else if (postId) {
          setErr("ลิงก์ไม่ถูกต้อง: postId ไม่ถูกต้อง");
        }
      } catch (e) {
        if (!ignore) setErr(e.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [postId, router]);

  const submitBooking = async (e) => {
  e.preventDefault();
  setErr("");

  if (!postId || !isHex24(postId)) { setErr("postId ไม่ถูกต้อง"); return; }
  if (!date || !hours) { setErr("กรุณากรอกวันที่และจำนวนชั่วโมง"); return; }
  if (allowedDates.length > 0 && !allowedDates.includes(date)) {
    setErr("วันที่ที่เลือกไม่ตรงกับวันที่ผู้ลงโพสต์เปิดรับจอง");
    return;
  }

  try {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        date,                       // รูปแบบ YYYY-MM-DD ตามที่คุณส่งอยู่ OK
        hours: Number(hours),
        notes: note.trim(),
      }),
    });

    // 🆕 ดักกรณีถูกจองแล้ว (API คืน 409)
    if (res.status === 409) {
      const data = await res.json().catch(() => ({}));
      setErr(data?.error || "มีคนจองแล้วในวันดังกล่าว");
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || data?.message || "จองไม่สำเร็จ");
    }

    router.push("/book");
  } catch (e) {
    setErr(e.message || "จองไม่สำเร็จ");
  }
};


  const mode = useMemo(() => (postId ? "form" : "list"), [postId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-rose-50 to-indigo-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <span>←</span><span>กลับหน้าหลัก</span>
          </Link>
        </div>

        {loading ? (
          <div>กำลังโหลด…</div>
        ) : err ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">{err}</div>
        ) : mode === "form" ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h1 className="text-xl font-bold mb-4">จองโพสต์</h1>

            <div className="text-xs text-gray-500 mb-2">วันที่เลือกได้: {allowedDates.length}</div>

            {post ? (
              <div className="mb-4 flex items-center gap-4">
                <img src={post.img} alt={post.title} className="w-32 h-20 object-cover rounded-lg border" />
                <div>
                  <div className="font-semibold">{post.title}</div>
                  <div className="text-sm text-gray-600">฿{Number(post.price).toLocaleString()}/ชม.</div>
                </div>
              </div>
            ) : null}

            <form onSubmit={submitBooking} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-800">วันที่ (เลือกตามวันที่ผู้ลงโพสต์เปิดรับ)</label>
                {allowedDates.length === 0 ? (
                  <div className="mt-1 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    ผู้ลงโพสต์ยังไม่เปิดวันที่ให้จอง หรืออยู่นอกช่วงที่กำหนด
                  </div>
                ) : (
                  <select
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    required
                  >
                    {allowedDates.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-800">จำนวนชั่วโมง</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-800">หมายเหตุ</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition"
                  disabled={allowedDates.length === 0}
                  title={allowedDates.length === 0 ? "ยังไม่มีวันที่เปิดให้จอง" : ""}
                >
                  ยืนยันการจอง
                </button>
              </div>
            </form>
          </div>
        ) : (
          <MyBookings />
        )}
      </div>
    </div>
  );
}

function MyBookings() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const reload = async () => {
    const res = await fetch("/api/bookings?role=buyer", { cache: "no-store" });
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      try { setLoading(true); await reload(); }
      catch { if (!ignore) setErr("โหลดรายการจองไม่สำเร็จ"); }
      finally { if (!ignore) setLoading(false); }
    })();
    return () => { ignore = true; };
  }, []);

  const doAction = async (id, action) => {
    try {
      setErr(""); setActing(id);
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "อัปเดตไม่สำเร็จ");
      await reload();
    } catch (e) {
      setErr(e.message || "อัปเดตไม่สำเร็จ");
    } finally {
      setActing(null);
    }
  };

  const dateStr = (d) => (d ? new Date(d).toISOString().slice(0,10) : "—");
  const fmt = (n) =>
    Number.isFinite(Number(n))
      ? new Intl.NumberFormat("th-TH",{style:"currency",currency:"THB",maximumFractionDigits:0}).format(Number(n))
      : "—";

  if (loading) return <div>กำลังโหลด…</div>;
  if (err) return <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">{err}</div>;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h1 className="text-xl font-bold mb-4">การจองของฉัน</h1>
      {items.length === 0 ? (
        <div className="text-gray-600">ยังไม่มีรายการจอง</div>
      ) : (
        <ul className="space-y-3">
          {items.map((bk) => (
            <li key={bk._id} className="border rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{bk.post?.title || "โพสต์"}</div>
                  <div className="text-sm text-gray-600">
                    วันที่ {dateStr(bk.date)} • {bk.hours} ชม. • รวม {fmt(bk.totalPrice)} • สถานะ {bk.status}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    {bk.renterConfirmed && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">ฉันยืนยันแล้ว</span>}
                    {bk.ownerConfirmed && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">เจ้าของโพสต์ยืนยันแล้ว</span>}
                  </div>
                </div>

                {bk.status === "pending" && !bk.renterConfirmed && (
                  <button
                    onClick={() => doAction(bk._id, "confirm")}
                    disabled={acting === bk._id}
                    className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800"
                  >
                    ยืนยันนัด
                  </button>
                )}

                {bk.status === "completed" && (
                  <Link
                    href={`/rate?booking=${bk._id}`}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm hover:bg-amber-600"
                  >
                    ให้คะแนน
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
