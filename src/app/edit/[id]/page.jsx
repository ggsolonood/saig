"use client"

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function EditPostPage({ params }) {
    const { id } = use(params);
    const [postData, setPostData] = useState("");

    const [newTitle, setNewTitle] = useState("");
    const [newImg, setNewImg] = useState("");
    const [newContent, setNewContent] = useState("");

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

    useEffect(() => {
        if (postData) {
            setNewTitle(postData.title || "");
            setNewImg(postData.img || "");
            setNewContent(postData.content || "");
        }
    }, [postData]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const res = await fetch(`http://localhost:3000/api/posts/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ newTitle, newImg, newContent }),
            });
            if (!res.ok) {
                throw new Error("Failed to update post");
            }
            router.refresh();
            router.push("/");
        } catch (error) {
            console.error("Error updating post:", error);
        }
    };
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
            {/* Header Section */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/">
                            <button className="group flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full transition-all duration-200 hover:shadow-md">
                                <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                <span>ย้อนกลับ</span>
                            </button>
                        </Link>
                        <div className="text-sm text-gray-500">
                            แก้ไขโพสต์
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-6 py-12">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                        Edit Post
                    </h1>
                    <p className="text-xl text-gray-600">
                        แก้ไขเรื่องราวและไอเดียของคุณ
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200/50 p-8 md:p-12">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Title Field */}
                        <div className="space-y-3">
                            <label className=" text-lg font-semibold text-gray-800 flex items-center space-x-2">
                                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                <span>หัวข้อ</span>
                            </label>
                            <input
                                type="text"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                placeholder="หัวข้อของโพสต์"
                                className="w-full bg-gray-50 border-2 border-gray-200 py-4 px-6 rounded-2xl text-lg"
                            />
                        </div>

                        {/* Image URL Field */}
                        <div className="space-y-3">
                            <label className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                                <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>URL รูปภาพ</span>
                            </label>
                            <input
                                type="url"
                                value={newImg}
                                onChange={e => setNewImg(e.target.value)}
                                placeholder="https://example.com/image.jpg"
                                className="w-full bg-gray-50 border-2 border-gray-200 py-4 px-6 rounded-2xl text-lg"
                            />
                        </div>

                        {/* Content Field */}
                        <div className="space-y-3">
                            <label className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>เนื้อหา</span>
                            </label>
                            <textarea
                                rows="8"
                                value={newContent}
                                onChange={e => setNewContent(e.target.value)}
                                placeholder="เขียนเรื่องราวของคุณที่นี่..."
                                className="w-full bg-gray-50 border-2 border-gray-200 py-4 px-6 rounded-2xl text-lg resize-none"
                            />
                        </div>
                        {/* ปุ่ม submit */}
                        <button
                            type="submit"
                            className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition"
                        >
                            บันทึกการแก้ไข
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default EditPostPage;