import { NextResponse } from 'next/server';
import { connectMongoDB } from "../../../../lib/mongodb";
import User from '../../../../models/user';

export async function GET(req) {
  await connectMongoDB();
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  const email = searchParams.get('email');

  const user = await User.findOne({
    $or: [
      { username },
      { email: email?.toLowerCase() }
    ]
  });

  return NextResponse.json({ exists: !!user });
}

export async function POST(req) {
  await connectMongoDB();
  try {
    const body = await req.json();
    const user = await User.create({
      ...body,
      email: body.email.toLowerCase()
    });
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    if (err.code === 11000) {
      // duplicate key error
      return NextResponse.json({ message: 'username หรือ email ซ้ำ' }, { status: 409 });
    }
    return NextResponse.json({ message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
