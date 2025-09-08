// app/reserved/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "../components/nav";
import { useRouter } from "next/navigation";

const fmtTHB = (n) =>
  Number.isFinite(Number(n))
    ? new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        maximumFractionDigits: 0,
      }).format(Number(n))
    : "—";

export default function ReservedPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [actingId, setActingId] = useState(null);

  const fetchMe = async () => {
    const meRes = await fetch("/api/auth/me", { cache: "no-store" });
    const meData = await meRes.json().catch(() => ({}));
    return meData?.user ?? null;
  };

  const reloadMe = async () => {
    const u = await fetchMe();
    setMe(u);
  };

  // โหลดตอนเข้าเพจ
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const user = await fetchMe();
        if (!user) {
          router.replace(`/login?next=${encodeURIComponent("/reserved")}`);
          return;
        }
        if (!ignore) setMe(user);

        const res = await fetch("/api/bookings?role=seller", { cache: "no-store" });
        if (!res.ok) throw new Error("โหลดรายการไม่สำเร็จ");
        const data = await res.json();
        if (!ignore) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!ignore) setErr(e.message || "เกิดข้อผิดพลาด");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => (ignore = true);
  }, [router]);

  const pending = useMemo(() => items.filter((b) => b.status === "pending"), [items]);
  const others  = useMemo(() => items.filter((b) => b.status !== "pending"), [items]);

  const reload = async () => {
    const list = await fetch("/api/bookings?role=seller", { cache: "no-store" });
    const arr = await list.json();
    setItems(Array.isArray(arr) ? arr : []);
  };

  const doAction = async (id, action) => {
    try {
      setErr("");
      const ok = window.confirm(
        action === "confirm" ? "ยืนยันการจองนี้หรือไม่?"
        : action === "cancel" ? "ต้องการยกเลิกการจองนี้หรือไม่?"
        : action === "complete" ? "ทำรายการเสร็จสิ้น?"
        : "ดำเนินการต่อ?"
      );
      if (!ok) return;

      setActingId(id);
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || "อัปเดตไม่สำเร็จ");

      // ถ้าทำรายการเสร็จสิ้น ให้ปรับยอดแบบ optimistic ก่อน
      if (action === "complete" && typeof data.amountCredited === "number") {
        setMe((m) => m ? { ...m, balance: (Number(m.balance) || 0) + data.amountCredited } : m);
      }

      // แล้วรีเฟรชรายการจอง + รีเฟรชข้อมูลผู้ใช้เพื่อให้ยอดตรงกับเซิร์ฟเวอร์
      await reload();
      await reloadMe();
    } catch (e) {
      setErr(e.message || "อัปเดตไม่สำเร็จ");
    } finally {
      setActingId(null);
    }
  };

  const dateStr = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "—");

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-rose-50 to-indigo-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <span>←</span><span>กลับหน้าหลัก</span>
          </Link>

          {/* แสดงยอดเงินของฉัน */}
          {me && (
            <div className="text-sm md:text-base font-semibold">
              ยอดเงินของฉัน: <span className="text-emerald-700">{fmtTHB(me.balance ?? 0)}</span>
            </div>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-fuchsia-600 via-rose-600 to-indigo-600 bg-clip-text text-transparent">
          การจองเข้ามา (โพสต์ของฉัน)
        </h1>

        {loading ? (
          <div className="mt-6">กำลังโหลด…</div>
        ) : err ? (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">{err}</div>
        ) : (
          <>
            {/* รออนุมัติ */}
            <section className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">รอการยืนยัน</h2>
              {pending.length === 0 ? (
                <div className="text-gray-600">ไม่มีรายการที่รอการยืนยัน</div>
              ) : (
                <ul className="space-y-4">
                  {pending.map((bk) => (
                    <li key={bk._id} className="border rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{bk.post?.title || "โพสต์"}</div>
                          <div className="text-sm text-gray-600">
                            วันที่ {dateStr(bk.date)} • {bk.hours} ชม. • ราคา {fmtTHB(bk.pricePerHour)} /ชม. • รวม {fmtTHB(bk.totalPrice)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ผู้จอง: {bk.renter?.username || "—"}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {bk.ownerConfirmed && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-900 text-white">
                                ฉันยืนยันแล้ว
                              </span>
                            )}
                            {bk.renterConfirmed && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                ผู้จองยืนยันแล้ว
                              </span>
                            )}
                            {!bk.ownerConfirmed && !bk.renterConfirmed && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                รอการยืนยัน
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex gap-2">
                          <button
                            onClick={() => doAction(bk._id, "confirm")}
                            disabled={bk.ownerConfirmed || actingId === bk._id}
                            className={
                              "px-3 py-1.5 rounded-lg text-sm " +
                              (bk.ownerConfirmed
                                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                                : "bg-gray-900 text-white hover:bg-gray-800")
                            }
                          >
                            {bk.ownerConfirmed ? "ยืนยันแล้ว" : "ยืนยัน"}
                          </button>
                          <button
                            onClick={() => doAction(bk._id, "cancel")}
                            disabled={actingId === bk._id}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* ประวัติการจอง */}
            <section className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">ประวัติการจอง</h2>
              {others.length === 0 ? (
                <div className="text-gray-600">ยังไม่มีประวัติ</div>
              ) : (
                <ul className="space-y-4">
                  {others.map((bk) => (
                    <li key={bk._id} className="border rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{bk.post?.title || "โพสต์"}</div>
                          <div className="text-sm text-gray-600">
                            วันที่ {dateStr(bk.date)} • {bk.hours} ชม. • รวม {fmtTHB(bk.totalPrice)} • สถานะ {bk.status}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ผู้จอง: {bk.renter?.username || "—"}
                          </div>
                        </div>

                        {bk.status === "confirmed" && (
                          <button
                            onClick={() => doAction(bk._id, "complete")}
                            disabled={actingId === bk._id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"
                          >
                            ทำรายการเสร็จสิ้น
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
