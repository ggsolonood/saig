// app/rate/page.jsx
"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/nav";

export default function RatePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const bookingId = sp.get("booking");

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bk, setBk] = useState(null);
  const [err, setErr] = useState("");

  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        // โหลดสถานะผู้ใช้ (ต้อง include คุกกี้)
        const meRes = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        const meData = await meRes.json().catch(() => ({}));
        if (!meData?.user) {
          const next = bookingId ? `/rate?booking=${bookingId}` : "/rate";
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
        if (!ignore) setMe(meData.user);

        // โหลดข้อมูลการจอง
        if (bookingId) {
          const res = await fetch(`/api/bookings/${bookingId}`, {
            cache: "no-store",
            credentials: "include",
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            if (!ignore) setErr(data?.error || `โหลดข้อมูลไม่สำเร็จ (${res.status})`);
            return;
          }
          if (!ignore) setBk(data);
        }
      } catch (e) {
        if (!ignore) setErr("โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [bookingId, router]);

  const canSubmit = useMemo(
    () => Boolean(bookingId) && Number.isFinite(Number(stars)) && stars >= 1 && stars <= 5 && !saving,
    [bookingId, stars, saving]
  );

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!canSubmit) return;
    try {
      setSaving(true);
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bookingId,
          stars: Number(stars),
          comment: comment.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "ให้คะแนนไม่สำเร็จ");
      router.push("/book");
    } catch (e) {
      setErr(e.message || "ให้คะแนนไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const Star = ({ i }) => (
    <button
      type="button"
      onClick={() => setStars(i)}
      className={(i <= stars ? "text-amber-500" : "text-gray-300") + " text-2xl"}
      aria-label={`${i} stars`}
    >
      ★
    </button>
  );

  const dateStr = (d) => (d ? new Date(d).toISOString().slice(0,10) : "—");

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-rose-50 to-indigo-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-4">
          <Link href="/book" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <span>←</span><span>กลับการจองของฉัน</span>
          </Link>
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-fuchsia-600 via-rose-600 to-indigo-600 bg-clip-text text-transparent">
          ให้คะแนนการเช่า
        </h1>

        {loading ? (
          <div className="mt-6">กำลังโหลด…</div>
        ) : err ? (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">{err}</div>
        ) : !bookingId ? (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
            ไม่พบ bookingId ในพารามิเตอร์
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
            {bk ? (
              <div className="border rounded-xl p-4">
                <div className="font-semibold">{bk.post?.title || "โพสต์"}</div>
                <div className="text-sm text-gray-600">
                  เจ้าของโพสต์: {bk.owner?.username || "—"} • วันที่ {dateStr(bk.date)}
                </div>
              </div>
            ) : (
              <div className="border rounded-xl p-4 text-sm text-gray-600">ไม่พบรายละเอียดการจอง</div>
            )}

            <div>
              <div className="text-sm font-semibold text-gray-800 mb-2">ให้ดาว</div>
              <div className="flex items-center gap-2">
                {[1,2,3,4,5].map(i => <Star key={i} i={i} />)}
                <span className="ml-2 text-sm text-gray-600">{stars} / 5</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-800">คิดเห็นเพิ่มเติม (ไม่บังคับ)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="mt-2 w-full bg-white border border-gray-300 rounded-xl px-3 py-2 outline-none focus:border-fuchsia-600 focus:ring-2 focus:ring-fuchsia-200"
                placeholder="บริการดี/ตรงเวลา/สุภาพ เป็นอย่างไรบ้าง?"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className="px-5 py-2.5 rounded-xl bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก…" : "ยืนยันการให้คะแนน"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
