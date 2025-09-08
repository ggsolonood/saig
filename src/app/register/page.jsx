"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("กรุณาใส่ชื่อ");
      return false;
    }
    if (!formData.surname.trim()) {
      setError("กรุณาใส่นามสกุล");
      return false;
    }
    if (!formData.username.trim()) {
      setError("กรุณาใส่ชื่อผู้ใช้");
      return false;
    }
    if (!formData.email.trim()) {
      setError("กรุณาใส่อีเมล");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("รูปแบบอีเมลไม่ถูกต้อง");
      return false;
    }

    if (formData.password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? "";

      // 1) เช็คซ้ำก่อน
      const qs = new URLSearchParams({
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
      }).toString();

      const checkRes = await fetch(`${base}/api/user?${qs}`, { method: "GET" });
      if (!checkRes.ok) {
        // ถ้าเกิด error จาก route เช็ค ให้ผ่านไป POST หรือแจ้งข้อความรวม ๆ
        // ที่นี่ขอเลือกแจ้งเตือน
        const errMsg = (await checkRes.json().catch(() => ({}))).message;
        setError(errMsg || "ไม่สามารถตรวจสอบข้อมูลซ้ำได้");
        setIsLoading(false);
        return;
      }

      const { usernameTaken, emailTaken } = await checkRes.json();
      if (usernameTaken) {
        setError("ชื่อผู้ใช้นี้ถูกใช้แล้ว");
        setIsLoading(false);
        return;
      }
      if (emailTaken) {
        setError("อีเมลนี้ถูกใช้แล้ว");
        setIsLoading(false);
        return;
      }

      // 2) สมัครสมาชิก
      const submitData = {
        name: formData.name.trim(),
        surname: formData.surname.trim(),
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: "user",
        income: 0,
      };

      const response = await fetch(`${base}/api/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        setSuccess("สมัครสมาชิกสำเร็จ! กำลังนำคุณไปยังหน้าเข้าสู่ระบบ...");
        setTimeout(() => router.push("/login"), 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก");
      }
    } catch (err) {
      console.error("Register error:", err);
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={handleGoBack}
            className="group flex items-center text-blue-600 hover:text-blue-800 font-medium transition-all duration-200 transform hover:translate-x-1"
          >
            <svg
              className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            ย้อนกลับ
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            สมัครสมาชิก
          </h2>
          <p className="text-blue-600">กรอกข้อมูลเพื่อสร้างบัญชีใหม่</p>
        </div>

        {/* Form Container */}
        <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl px-8 pt-6 pb-8 border border-blue-100">
          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-r-lg">
              <div className="flex">
                <svg className="w-5 h-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-400 text-green-700 px-4 py-3 rounded-r-lg">
              <div className="flex">
                <svg className="w-5 h-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {success}
              </div>
            </div>
          )}

          {/* Name and Surname Row */}
          <div className="flex space-x-4 mb-4">
            <div className="flex-1">
              <label className="block text-blue-800 text-sm font-semibold mb-2">ชื่อ</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-blue-50/50"
                placeholder="ชื่อ"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-blue-800 text-sm font-semibold mb-2">นามสกุล</label>
              <input
                type="text"
                name="surname"
                value={formData.surname}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-blue-50/50"
                placeholder="นามสกุล"
                required
              />
            </div>
          </div>

          {/* Username */}
          <div className="mb-4">
            <label className="block text-blue-800 text-sm font-semibold mb-2">ชื่อผู้ใช้</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-blue-50/50"
              placeholder="ชื่อผู้ใช้"
              required
            />
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-blue-800 text-sm font-semibold mb-2">อีเมล</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-blue-50/50"
              placeholder="example@email.com"
              required
            />
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className="block text-blue-800 text-sm font-semibold mb-2">รหัสผ่าน</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-3 pr-12 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-blue-50/50"
                placeholder="รหัสผ่าน"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 px-4 flex items-center text-blue-500 hover:text-blue-700 transition-colors"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="mb-6">
            <label className="block text-blue-800 text-sm font-semibold mb-2">ยืนยันรหัสผ่าน</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-3 pr-12 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-blue-50/50"
                placeholder="ยืนยันรหัสผ่าน"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 px-4 flex items-center text-blue-500 hover:text-blue-700 transition-colors"
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-3 px-6 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                กำลังสมัครสมาชิก...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                สมัครสมาชิก
              </>
            )}
          </button>
        </div>

        {/* Login Link */}
        <div className="text-center mt-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl px-6 py-4 border border-blue-100">
            <p className="text-blue-600 text-sm">
              มีบัญชีอยู่แล้ว?{" "}
              <a href="/login" className="text-blue-700 hover:text-cyan-600 font-semibold transition-colors duration-200 hover:underline">
                เข้าสู่ระบบ
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
