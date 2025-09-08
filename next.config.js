/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "www.google.com",
      "encrypted-tbn0.gstatic.com", // ✅ แค่ใส่ hostname เป็น string
    ],
  },
};

module.exports = nextConfig;
