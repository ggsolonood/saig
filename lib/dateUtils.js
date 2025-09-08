// lib/dateUtils.js

// ตรวจว่าเป็นพ.ศ. คร่าว ๆ
function maybeBuddhistYear(y) {
  return y >= 2400;
}

function normalizeYear(y) {
  if (!Number.isFinite(y)) return null;
  if (maybeBuddhistYear(y)) y -= 543; // แปลง พ.ศ. → ค.ศ.
  if (y < 1900 || y > 2100) return null; // กันปีหลุด
  return y;
}

export function dateOnlyFromYMDUTC(y, m, d) {
  y = normalizeYear(Number(y));
  m = Number(m);
  d = Number(d);
  if (!y || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== (m - 1) || dt.getUTCDate() !== d) return null;
  return dt;
}

export function dateOnlyFromYYYYMMDD(s) {
  if (typeof s !== "string") return null;
  const m = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return dateOnlyFromYMDUTC(Number(m[1]), Number(m[2]), Number(m[3]));
}

export function toDateOnlyUTCFlexible(input) {
  if (typeof input === "string") return dateOnlyFromYYYYMMDD(input);
  if (input && typeof input === "object") {
    const y = input.year ?? input.y;
    const m = input.month ?? input.m;
    const d = input.day ?? input.d;
    return dateOnlyFromYMDUTC(y, m, d);
  }
  return null;
}
