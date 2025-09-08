import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true },
  surname: { type: String, required: true },
  username: { type: String, required: true, unique: true }, 
  email: { type: String, required: true, unique: true },     
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  income: { type: Number, default: 0 },
}, { timestamps: true });

// เผื่อบางกรณีที่ MongoDB ยังไม่ได้สร้าง index
//userSchema.index({ username: 1 }, { unique: true });
// userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
