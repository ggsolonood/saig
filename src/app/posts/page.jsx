// app/posts/page.jsx  ← เปลี่ยนชื่อโฟลเดอร์ให้ตรงกับลิงก์

import Link from "next/link";
import Navbar from "../components/nav";
import PostCard from "../components/PostCard";

async function getPosts() {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  const res = await fetch(`${base}/api/posts`, { cache: "no-store" });
  if (!res.ok) throw new Error("Fetch failed");
  const data = await res.json();
  return Array.isArray(data) ? data : data.posts || [];
}

export default async function PostsPage() {
  let posts = [];
  try {
    posts = await getPosts();
  } catch (e) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-rose-50 to-indigo-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-extrabold mb-6">โพสต์แฟนเช่าทั้งหมด</h1>
          <div className="text-center text-red-600">โหลดโพสต์ไม่สำเร็จ</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-rose-50 to-indigo-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold">โพสต์แฟนเช่าทั้งหมด</h1>
          <Link href="/create" className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800">
            สร้างประกาศ
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="text-center text-gray-500">ยังไม่มีโพสต์</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((p) => (
              <PostCard
                key={p._id || p.id}
                id={p._id || p.id}
                title={p.title}
                img={p.img}
                content={p.content}
                price={p.price}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
