"use client"

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function DeletePostPage({ params }) {
    const { id } = use(params);
    const [postData, setPostData] = useState("");

    const router = useRouter();

    const getPostsById = async () => {
        try {
            const response = await fetch(`http://localhost:3000/api/posts/${id}`, {
                method: "GET",
                cache: "no-store",
            });
            if (!response.ok) {
                throw new Error("Failed to fetch post data");
            }
            const data = await response.json();
            setPostData(data.post);
        } catch (error) {
            console.error("Error fetching posts:", error);
        }
    };

    useEffect(() => {
        getPostsById();
    }, [id]);

    const handleDelete = async () => {
        try {
            const res = await fetch(`http://localhost:3000/api/posts/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                throw new Error("Failed to delete post");
            }
            router.refresh();
            router.push("/");
        } catch (error) {
            console.error("Error deleting post:", error);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
            <div className="max-w-3xl mx-auto p-6">
                <h1 className="text-4xl font-bold mb-6 text-center text-red-600">ลบโพสต์</h1>
                {postData ? (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-2xl font-semibold mb-4">{postData.title}</h2>
                        {postData.img && (
                            <img
                                src={postData.img}
                                alt={postData.title}
                                className="w-full h-auto mb-4 rounded"
                            />
                        )}
                        <p className="text-gray-700 mb-6">{postData.content}</p>
                        <div className="flex justify-between">
                            <button
                                onClick={handleDelete}
                                className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition"
                            >
                                ยืนยันการลบ
                            </button>
                            <Link
                                href="/"
                                className="bg-gray-300 text-gray-800 py-2 px-4 rounded hover:bg-gray-400 transition"
                            >
                                ยกเลิก
                            </Link>
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-gray-500">กำลังโหลดข้อมูลโพสต์...</p>
                )}
            </div>
        </div>
    );
}
export default DeletePostPage;