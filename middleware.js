import { NextResponse } from "next/server";

export function middleware(req) {
  const token = req.cookies.get("auth")?.value;
  const url = req.nextUrl;

  if (url.pathname.startsWith("/create") && !token) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", url.pathname + url.search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/create"], // ❗ ห้ามใส่ /api/*
};
