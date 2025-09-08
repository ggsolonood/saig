// app/components/PostCard.jsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export default function PostCard({
  id,
  title = "",
  img = "",
  content = "",
  price = 0,
  zones = [],
  activities = [],
  availabilityDays = [],
  hrefBase = "/posts",
  showDetailLink = true,

  // ⬇️ เพิ่มพร็อพสำหรับเรตติ้ง
  ratingAvg = 0,      // ค่ากลาง 0..5 (float ได้)
  ratingCount = 0,    // จำนวนรีวิว
}) {
  const [imgError, setImgError] = useState(false);

  const priceText = useMemo(() => {
    const n = Number(price);
    const formatted = Number.isFinite(n)
      ? new Intl.NumberFormat("th-TH").format(n)
      : "—";
    return `฿${formatted}/ชม.`;
  }, [price]);

  const snippet = useMemo(() => truncate(content, 90), [content]);

  const zone = zones?.[0] || "";
  const dayChips = (availabilityDays || []).slice(0, 3);
  const actChips = (activities || []).slice(0, 3);

  const hasImage = !!img && !imgError;

  const detailHref = id ? `${hrefBase.replace(/\/$/, "")}/${id}` : "#";

  // === Rating UI ===
  const avg = Number(ratingAvg) || 0;
  const percent = Math.max(0, Math.min(100, (avg / 5) * 100));
  const countLabel = ratingCount > 0 ? `(${ratingCount})` : "ยังไม่มีรีวิว";

  return (
    <div className="group bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-xl hover:border-gray-300 transition-all duration-300">
      {/* รูป */}
      <div className="relative w-full aspect-[16/9] overflow-hidden">
        {hasImage ? (
          <img
            src={img}
            alt={title || "post image"}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-fuchsia-100 via-rose-100 to-indigo-100">
            <span className="text-xl font-bold text-gray-600">
              {initials(title || "โพสต์")}
            </span>
          </div>
        )}

        {/* ป้ายราคา */}
        <div className="absolute left-3 top-3">
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-900 text-white shadow">
            {priceText}
          </span>
        </div>

        {/* โซน */}
        {zone ? (
          <div className="absolute right-3 top-3">
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/90 text-gray-800 border border-gray-200 backdrop-blur">
              {zone}
            </span>
          </div>
        ) : null}
      </div>

      {/* เนื้อหา */}
      <div className="p-4">
        <h3 className="text-base font-extrabold line-clamp-2 min-h-[2.8rem]">
          {title || "โพสต์ไม่มีชื่อ"}
        </h3>

        <p className="mt-1.5 text-sm text-gray-600 line-clamp-2 min-h-[2.25rem]">
          {snippet}
        </p>

        {/* ชิปกิจกรรม/วันว่าง */}
        {(actChips.length > 0 || dayChips.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {actChips.map((t) => (
              <span
                key={`act-${t}`}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-fuchsia-600 via-rose-600 to-indigo-600 text-white"
                title={t}
              >
                {t}
              </span>
            ))}
            {dayChips.map((d) => (
              <span
                key={`day-${d}`}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200"
                title={d}
              >
                {d}
              </span>
            ))}
          </div>
        )}

        {/* ปุ่ม + Rating */}
        <div className="mt-4 flex items-center justify-between">
          {showDetailLink && id ? (
            <Link
              href={detailHref}
              prefetch={false}
              className="text-sm font-semibold text-indigo-700 hover:text-indigo-900"
            >
              ดูรายละเอียด →
            </Link>
          ) : (
            <span className="text-sm text-gray-400"> </span>
          )}

          {/* ⭐ Rating bar */}
<div className="flex items-center gap-2" title={`${avg.toFixed(1)} / 5`}>
  <div className="relative leading-none select-none">
    <div className="text-gray-300 tracking-tight">★★★★★</div>
    <div className="absolute inset-0 overflow-hidden" style={{ width: `${percent}%` }}>
      <div className="text-amber-500 tracking-tight">★★★★★</div>
    </div>
  </div>
  <span className="text-sm font-semibold text-gray-800">{avg.toFixed(1)}</span>
  <span className="text-xs text-gray-600">{countLabel}</span>
</div>

        </div>
      </div>
    </div>
  );
}

/* -------- utils -------- */

function truncate(str, max = 100) {
  const s = String(str ?? "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/\s+$/, "") + "…";
}

function initials(str) {
  const s = String(str ?? "").trim();
  if (!s) return "โพส";
  const chars = [...s];
  const pick = (chars[0] || "") + (chars[1] || "");
  return pick.toUpperCase();
}
