import mongoose from "mongoose";

let isConnected = false;

export async function connectMongoDB() {
  if (isConnected) return;

  await mongoose.connect(process.env.MONGODB_URL, {
    dbName: process.env.MONGODB_DB || undefined,
  });

  isConnected = true;
}
