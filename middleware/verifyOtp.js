import { generateOtp } from '../utils/generateOtp.js';// ฟังก์ชันสร้าง OTP และบันทึกลงใน DB
import { sendOtpEmail } from '../utils/emailService.js';  // ฟังก์ชันส่งอีเมล OTP
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// ค้างการเอา  verifyotp มาอยู่ในน
export const requestOtp = async (req, res) => {
  try {
    const { lineUserId } = req.body;

    if (!lineUserId || typeof lineUserId !== 'string' || lineUserId.trim() === '') {
      return res.status(400).json({ error: 'Invalid or empty lineUserId' });
    }

    console.log('Requesting OTP for lineUserId:', lineUserId);

    const user = await prisma.prv_Users.findUnique({
      where: { lineUserId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found. Please log in again.' });
    }

    const { email } = user;

    if (!email) {
      return res.status(400).json({ error: 'No email is associated with this user. Please update your email first.' });
    }

    // ลบ OTP ที่หมดอายุ
    await prisma.prv_Otp.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    // ตรวจสอบ OTP ที่ยังไม่หมดอายุ
    const existingOtp = await prisma.prv_Otp.findUnique({
      where: { userId: user.id },
    });

    if (existingOtp && existingOtp.expiresAt > new Date()) {
      return res.status(429).json({ error: 'OTP already sent. Please wait before requesting a new one.' });
    }

    const otpCode = await generateOtp(user.id);

    await prisma.prv_Otp.upsert({
      where: { userId: user.id },
      update: {
        code: otpCode,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // หมดอายุใน 5 นาที
      },
      create: {
        userId: user.id,
        code: otpCode,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    await sendOtpEmail(email, otpCode);

    res.status(200).json({
      message: 'OTP has been sent to your email. Please verify within 5 minutes.',
      userId: user.id,
    });
  } catch (error) {
    console.error('Error in requestOtp:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};



export const verifyOtp = async (req, res) => {
  try {
    const { lineUserId, otpCode } = req.body;

    if (!lineUserId || !otpCode || typeof lineUserId !== 'string' || typeof otpCode !== 'string') {
      return res.status(400).json({ error: 'Invalid or empty lineUserId or otpCode' });
    }

    console.log('Received data:', { lineUserId, otpCode });

    const user = await prisma.prv_Users.findUnique({
      where: { lineUserId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const otpRecord = await prisma.prv_Otp.findUnique({
      where: { userId: user.id },
    });

    if (!otpRecord) {
      return res.status(404).json({ error: 'OTP record not found' });
    }

    if (otpRecord.code !== otpCode) {
      return res.status(400).json({ error: 'Invalid OTP code' });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ error: 'OTP code has expired' });
    }

    await prisma.prv_Users.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    await prisma.prv_Status.upsert({
      where: { userId: user.id },
      update: { status: 3 },
      create: { userId: user.id, status: 3 },
    });

    await prisma.prv_Otp.delete({
      where: { userId: user.id },
    });

    res.status(200).json({
      message: 'Email verified successfully!',
      userStatus: { id: user.id, isVerified: true, status: 3 },
    });
  } catch (error) {
    console.error('Error in verifyOtp:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};







 