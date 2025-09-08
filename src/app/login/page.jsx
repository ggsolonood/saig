"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    identifier: "",   // ← ต้องชื่อนี้
    password: "",     // ← และชื่อนี้
    remember: true,
  });
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();               // กัน reload
    setErr("");
    if (!form.identifier.trim() || !form.password) {
      setErr("กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: form.identifier.trim(),   // ← ชื่อคีย์ต้องตรงกับ API
          password: form.password,
          remember: form.remember,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.message || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }

      router.push("/"); // cookie ถูกตั้งจาก API แล้ว
    } catch (e) {
      setErr("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 px-4 py-12">
      <div className="w-full max-w-md bg-white/90 border border-blue-100 shadow-xl rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600 mb-6">
          เข้าสู่ระบบ
        </h1>

        {err && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-r-lg">
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-blue-800 text-sm font-semibold mb-2">
              ชื่อผู้ใช้หรืออีเมล
            </label>
            <input
              type="text"
              name="identifier"                 // ← name ต้องตรงกับ state
              value={form.identifier}
              onChange={onChange}
              className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 bg-blue-50/50"
              placeholder="username หรือ email"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-blue-800 text-sm font-semibold mb-2">
              รหัสผ่าน
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                name="password"                 // ← ต้องชื่อ password
                value={form.password}
                onChange={onChange}
                className="w-full px-4 py-3 pr-12 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 bg-blue-50/50"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute inset-y-0 right-0 px-4 flex items-center text-blue-500 hover:text-blue-700"
              >
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-blue-700">
            <input
              type="checkbox"
              name="remember"
              checked={form.remember}
              onChange={onChange}
              className="accent-blue-600"
            />
            จำฉันไว้
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 flex items-center justify-center transition-all"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                กำลังเข้าสู่ระบบ...
              </>
            ) : (
              "เข้าสู่ระบบ"
            )}
          </button>
        </form>

        <p className="text-center text-blue-600 text-sm mt-6">
          ยังไม่มีบัญชี?{" "}
          <a href="/register" className="text-blue-700 hover:text-cyan-600 font-semibold hover:underline">
            สมัครสมาชิก
          </a>
        </p>
      </div>
    </div>
  );
}
