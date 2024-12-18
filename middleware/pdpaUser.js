import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

export const pdpaAccess = async (req, res) => {
  const { lineUserId, checkbox1 } = req.body; // Only handle checkbox1
  console.log("Received data:", { lineUserId, checkbox1 });

  try {
      // Check if lineUserId is provided
      if (!lineUserId) {
          return res.status(400).json({ success: false, message: 'lineUserId is required' });
      }

      // Find user in Prv_Users table by lineUserId
      const user = await prisma.prv_Users.findUnique({
          where: { lineUserId },
      });
      console.log("User found:", user); // Log if user is found

      if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Ensure the user has completed basic information in Prv_Users table
      if (!user.firstname || !user.lastname || !user.mobile || !user.email) {
          return res.status(400).json({
              success: false,
              message: 'User must complete basic information before providing PDPA consent',
          });
      }

      // Upsert PDPA consent into Prv_Pdpa table
      const pdpa = await prisma.prv_Pdpa.upsert({
          where: { userId: user.id }, // Find by userId
          update: {
            checkbox1: true, // ตั้งค่าเป็น true เสมอ
          },
          create: {
              userId: user.id,
              checkbox1: true, // ตั้งค่าเป็น true เสมอ
          },
      });
      console.log("Consent saved successfully:", pdpa); // Log success

      // Update status in Prv_Status table to 2
      await prisma.prv_Status.upsert({
          where: { userId: user.id },
          update: { status: 2 },
          create: { userId: user.id, status: 2 },
      });
      console.log("User status updated to 2");

      res.status(201).json({
          success: true,
          message: 'Consent saved successfully!',
          userId: user.id,
          pdpa,
      });
  } catch (error) {
      console.error('Error saving consent:', error); // Log error details
      res.status(500).json({
          success: false,
          message: 'Failed to save consent. Please try again.',
      });
  }
};



export const pdpaShow = async (req, res) => {
    const { lineUserId } = req.query; // ดึง lineUserId จาก query
  
    try {
      if (!lineUserId) {
        return res.status(400).json({ success: false, message: "Line User ID is required" });
      }
  
      // ค้นหาผู้ใช้ใน Prv_Users
      const user = await prisma.prv_Users.findUnique({
        where: { lineUserId },
        select: { id: true }, // ดึงเฉพาะ id
      });
  
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      // ตรวจสอบว่ามีข้อมูลใน Prv_Pdpa หรือไม่
      let pdpa = await prisma.prv_Pdpa.findUnique({
        where: { userId: user.id },
      });
  
      // หากไม่มีข้อมูล PDPA ให้สร้างข้อมูลใหม่
      if (!pdpa) {
        pdpa = await prisma.prv_Pdpa.create({
          data: {
            userId: user.id,
            checkbox1: false, // ค่าเริ่มต้น
          },
        });
      }
  
      res.status(200).json({
        success: true,
        message: "PDPA record retrieved successfully",
        pdpa,
      });
    } catch (error) {
      console.error("Error retrieving PDPA record:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve PDPA record. Please try again.",
      });
    }
  };
  
  
  