import express from 'express';
import { PrismaClient } from '@prisma/client';
import s3 from '../utils/awsConfig.js';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { generateQRCode } from '../utils/qrCodeGenerator.js'
const prisma = new PrismaClient();
const router = express.Router();

export const getUserPrivilege = async (req, res) => {
  const { lineUserId } = req.query;

  try {
    console.log('Request received with lineUserId:', lineUserId);

    if (!lineUserId) {
      console.log('Line User ID is missing');
      return res.status(400).json({
        success: false,
        message: 'Line User ID is required',
      });
    }

    // ค้นหาผู้ใช้โดย lineUserId
    const user = await prisma.prv_Users.findUnique({
      where: { lineUserId },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        mobile: true,
        email: true,
        birthday: true,
        nationality: true,
      },
    });

    if (!user) {
      console.log('User not found with lineUserId:', lineUserId);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Combine firstname and lastname into fullname
    const fullname = `${user.firstname || ''} ${user.lastname || ''}`.trim();

    // ค้นหา Privilege
    let privilege = await prisma.prv_Privilege.findFirst({
      where: { userId: user.id },
    });

    if (!privilege) {
      const lastPrivilege = await prisma.prv_Privilege.findFirst({
        orderBy: { prvLicenseId: 'desc' },
      });

      const newLicenseId = (lastPrivilege?.prvLicenseId || 0) + 1;

      privilege = await prisma.prv_Privilege.create({
        data: {
          userId: user.id,
          prvType: 'Gold',
          prvExpiredDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          currentAmount: 0,
          totalAmountPerYear: 0,
          currentPoint: 0,
          prvLicenseId: newLicenseId,
          registeredDate: new Date(),
        },
      });
    }

    // Prepare QR Code data
    const qrData = {
      fullname,
      mobile: user.mobile,
      email: user.email,
      birthday: user.birthday,
      nationality: user.nationality,
    };

    // ตรวจสอบว่า QR Code มีอยู่ในฐานข้อมูลหรือไม่
    let qrCode = await prisma.prv_QRCode.findFirst({
      where: {
        code: JSON.stringify(qrData),
        type: 'user',
        status: 'active',
      },
    });

    let qrCodeBase64;

    if (qrCode && qrCode.imageBase64) {
      // ถ้ามี QR Code อยู่แล้วและมี Base64 ให้ใช้ข้อมูลเดิม
      console.log('Existing QR Code found:', qrCode);
      qrCodeBase64 = qrCode.imageBase64;
    } else {
      // สร้าง QR Code ใหม่
      qrCodeBase64 = await generateQRCode(qrData);

      // บันทึก QR Code ใหม่ลงฐานข้อมูล
      qrCode = await prisma.prv_QRCode.create({
        data: {
          code: JSON.stringify(qrData),
          imageBase64: qrCodeBase64, // เก็บ Base64
          type: 'user',
          status: 'active',
          expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        },
      });

      console.log('New QR Code created and saved to database');
    }

    // Respond with user privilege and QR Code
    res.status(200).json({
      success: true,
      data: {
        fullname,
        mobile: user.mobile,
        email: user.email,
        birthday: user.birthday,
        nationality: user.nationality,
        prvType: privilege.prvType,
        prvExpiredDate: privilege.prvExpiredDate,
        currentPoint: privilege.currentPoint,
        prvLicenseId: privilege.prvLicenseId
          ? privilege.prvLicenseId.toString().padStart(4, '0')
          : '0000',
        registeredDate: privilege.registeredDate,
        qrCodeBase64: qrCodeBase64.startsWith('data:image/png;base64,') 
          ? qrCodeBase64 // ใช้ Base64 ที่มี prefix อยู่แล้ว
          : `data:image/png;base64,${qrCodeBase64}`, // เพิ่ม prefix หากไม่มี
      },
    });
    
  } catch (error) {
    console.error('Error in getUserPrivilege:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching privilege data',
    });
  }
};


// export const getProducts = async (req, res) => {
//   try {
//     const { lineUserId } = req.query;

//     // Validate that lineUserId is provided
//     if (!lineUserId) {
//       return res.status(400).json({ error: "Line User ID is required." });
//     }

//     // Find the user by lineUserId
//     const user = await prisma.prv_Users.findUnique({
//       where: { lineUserId },
//       select: { id: true },
//     });

//     if (!user) {
//       return res.status(404).json({ error: "User not found." });
//     }

//     const userId = user.id;

//     // Retrieve user's current points from Prv_Privilege
//     const privilege = await prisma.prv_Privilege.findFirst({
//       where: { userId },
//     });

//     if (!privilege) {
//       return res.status(404).json({ error: "User privilege not found." });
//     }

//     const maxPoints = privilege.currentPoint;

//     // Retrieve product IDs already redeemed by the user
//     const redeemedProductIds = await prisma.prv_History.findMany({
//       where: { userId },
//       select: { productId: true },
//     });

//     const redeemedIds = redeemedProductIds.map((history) => history.productId);

//     // Fetch all products
//     const products = await prisma.prv_Product.findMany({
//       select: {
//         id: true,
//         productName: true, // Include product name
//         point: true,
//       },
//     });

//     // Map products to include an isRedeemable flag
//     const productsWithRedeemableFlag = products.map((product) => ({
//       ...product,
//       isRedeemable: product.point <= maxPoints && !redeemedIds.includes(product.id),
//     }));

//     res.status(200).json({
//       message: "Products retrieved successfully!",
//       maxPoints,
//       products: productsWithRedeemableFlag,
//     });
//   } catch (error) {
//     console.error("Error retrieving products:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

export const redeemProduct = async (req, res) => {
  try {
    const { lineUserId, productId, options } = req.body;

    // Validate required parameters
    if (!lineUserId || !productId) {
      return res.status(400).json({ error: 'Line User ID and Product ID are required.' });
    }

    // Fetch user based on lineUserId
    const user = await prisma.prv_Users.findUnique({
      where: { lineUserId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userId = user.id;

    // Fetch privilege data
    const privilege = await prisma.prv_Privilege.findFirst({
      where: { userId },
    });

    if (!privilege) {
      return res.status(404).json({ error: 'User privilege not found.' });
    }

    // Fetch product data
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Check if the user has enough points
    if (privilege.currentPoint < product.point) {
      return res.status(400).json({ error: 'Insufficient points to redeem this product.' });
    }

    // Fetch product stock
    const productStock = await prisma.productStock.findFirst({
      where: { productId: parseInt(productId), quantity: { gt: 0 } },
    });

    if (!productStock) {
      return res.status(400).json({ error: 'Product is out of stock.' });
    }

    // Generate new QR Code
    const qrCodeData = {
      userId,
      productId,
      options,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Expire in 10 minutes
    };

    const qrCodeString = JSON.stringify(qrCodeData);
    const qrCodeImage = await generateQRCode(qrCodeString); // Generate QR Code image

    // Create QR Code
    const qrCode = await prisma.prv_QRCode.create({
      data: {
        code: qrCodeString,
        type: 'redeem',
        status: 'active',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Expire in 10 minutes
      },
    });

    // Record redemption in history and save QR Code
    const redeemedHistory = await prisma.prv_History.create({
      data: {
        userId,
        productId: parseInt(productId),
        transactionDate: new Date(),
        options: options || {},
        productStockId: productStock.id, // Link to product stock
        qrCodeId: qrCode.id, // Link to QR Code
        status: 'pending', // Initial status
      },
    });

    // Deduct points and update privilege
    const updatedPrivilege = await prisma.prv_Privilege.update({
      where: { id: privilege.id },
      data: {
        currentPoint: privilege.currentPoint - product.point,
      },
    });

    // Update product stock
    await prisma.productStock.update({
      where: { id: productStock.id },
      data: { quantity: productStock.quantity - 1 },
    });

    res.status(200).json({
      message: 'Product redeemed successfully! QR Code generated.',
      product,
      remainingPoints: updatedPrivilege.currentPoint,
      qrCode,
      qrCodeImage, // Base64 image of QR Code
    });
  } catch (error) {
    console.error('Error redeeming product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRedeemedHistory = async (req, res) => {
  try {
    const { lineUserId } = req.query;

    if (!lineUserId) {
      return res.status(400).json({ error: "Line User ID is required." });
    }

    // Find the user by lineUserId
    const user = await prisma.prv_Users.findUnique({
      where: { lineUserId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const userId = user.id;

    // Fetch approved redeemed history
    const redeemedHistory = await prisma.prv_History.findMany({
      where: {
        userId,
        status: "approved", // Fetch only approved history
      },
      include: {
        productStock: {
          include: {
            Product: true, // Include the full product details
            color: true, // Include color details
            size: true, // Include size details
          },
        },
      },
    });

    if (redeemedHistory.length === 0) {
      return res.status(404).json({ message: "No redeemed history found." });
    }

    // Helper function to extract the key from the URL
    const getKeyFromUrl = (url) => {
      const urlParts = url.split("/");
      return urlParts.slice(3).join("/");
    };

    // Format the data and generate signed URLs
    const formattedHistory = await Promise.all(
      redeemedHistory.map(async (history) => {
        let signedUrl = null;
        if (history.productStock.Product.imagepath) {
          try {
            const key = history.productStock.Product.imagepath.includes("http")
              ? getKeyFromUrl(history.productStock.Product.imagepath.trim())
              : history.productStock.Product.imagepath.trim();
            const command = new GetObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: key,
            });
            signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
          } catch (error) {
            console.error(`Error generating Signed URL for ${history.productStock.Product.name}:`, error.message);
          }
        }

        return {
          id: history.id,
          transactionDate: history.transactionDate.toISOString(), // Ensure ISO string
          productId: history.productStock.productId,
          productName: history.productStock.Product.name,
          productDescription: history.productStock.Product.description,
          productImage: signedUrl || null, // Use signed URL or fallback to null
          pointsUsed: history.productStock.Product.point,
          color: history.productStock.color.type,
          size: history.productStock.size.type,
          quantity: history.productStock.quantity,
        };
      })
    );

    res.status(200).json({
      message: "Approved redeemed history retrieved successfully!",
      history: formattedHistory,
    });
  } catch (error) {
    console.error("Error retrieving redeemed history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getallreward = async (req, res) => {
  try {
    // Fetch all products from the database
    const products = await prisma.prv_Product.findMany({
      select: {
        id: true,
        productName: true,
        point: true,
      },
    });

    if (products.length === 0) {
      return res.status(404).json({ message: "No rewards available." });
    }

    res.status(200).json({
      success: true,
      message: "All rewards retrieved successfully.",
      products,
    });
  } catch (error) {
    console.error("Error fetching all rewards:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};


export const getProducts = async (req, res) => {
  try {
    const { lineUserId } = req.query;

    if (!lineUserId) {
      return res.status(400).json({ error: "Line User ID is required." });
    }

    // ดึงข้อมูลผู้ใช้
    const user = await prisma.prv_Users.findUnique({
      where: { lineUserId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const userId = user.id;

    // ดึงข้อมูลคะแนนของผู้ใช้
    const privilege = await prisma.prv_Privilege.findFirst({
      where: { userId },
    });

    if (!privilege) {
      return res.status(404).json({ error: "User privilege not found." });
    }

    const maxPoints = privilege.currentPoint;

    // ดึงข้อมูลสินค้าที่ผู้ใช้เคยแลก
    const redeemedProducts = await prisma.prv_History.findMany({
      where: { userId },
      select: { productId: true },
    });

    const redeemedProductIds = redeemedProducts.map((history) => history.productId);

    // ดึงข้อมูลสินค้า
    const products = await prisma.product.findMany({
      include: {
        ProductStock: {
          include: {
            color: { select: { type: true } },
            size: { select: { type: true } },
          },
        },
      },
    });

    // ฟังก์ชันสร้าง Signed URL
    const getKeyFromUrl = (url) => {
      const urlParts = url.split("/");
      return urlParts.slice(3).join("/");
    };

    const productsWithDetails = await Promise.all(
      products.map(async (product) => {
        let signedUrl = null;
        if (product.imagepath) {
          try {
            const key = product.imagepath.includes("http")
              ? getKeyFromUrl(product.imagepath.trim())
              : product.imagepath.trim();
            const command = new GetObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: key,
            });
            signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
          } catch (error) {
            console.error(`Error generating Signed URL for ${product.name}:`, error.message);
          }
        }

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          point: product.point,
          isRedeemable: product.point <= maxPoints && !redeemedProductIds.includes(product.id),
          imageUrl: signedUrl || null,
          combinations: product.ProductStock.map((stock) => ({
            id: stock.id,
            itemCode: stock.itemCode,
            quantity: stock.quantity,
            color: stock.color.type,
            size: stock.size.type,
          })),
        };
      })
    );

    res.status(200).json({
      message: "Products retrieved successfully!",
      maxPoints,
      products: productsWithDetails,
    });
  } catch (error) {
    console.error("Error retrieving products:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};


export const generateQRCodeProduct = async (req, res) => {
  const { lineUserId, productId, color, size } = req.body;

  if (!lineUserId || !productId || !color || !size) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    console.log("Request Body:", req.body);

    // Fetch user
    const user = await prisma.prv_Users.findUnique({
      where: { lineUserId },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Fetch product
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    // Fetch color and size
    const colorData = await prisma.productType.findUnique({
      where: { type: color },
      select: { id: true },
    });
    if (!colorData) {
      return res.status(400).json({ error: `Color "${color}" not found.` });
    }

    const sizeData = await prisma.productType.findUnique({
      where: { type: size },
      select: { id: true },
    });
    if (!sizeData) {
      return res.status(400).json({ error: `Size "${size}" not found.` });
    }

    // Fetch product stock
    const productStock = await prisma.productStock.findFirst({
      where: {
        productId: productId,
        colorId: colorData.id,
        sizeId: sizeData.id,
      },
    });
    if (!productStock || productStock.quantity <= 0) {
      return res.status(400).json({ error: "Product out of stock." });
    }

    // Set QR code expiration time
    const qrCodeExpiry = new Date();
    qrCodeExpiry.setMinutes(qrCodeExpiry.getMinutes() + 10);

    // Create QR Code entry in the database (without the final code)
    const newQrCode = await prisma.prv_QRCode.create({
      data: {
        code: "", // Temporary placeholder
        imageBase64: null, // Placeholder for the image
        type: "product",
        expiresAt: qrCodeExpiry,
      },
    });

    // Generate QR Code data including the `qrCodeId`
    const qrCodeData = {
      qrCodeId: newQrCode.id, // Include the generated ID
      lineUserId,
      productId,
      color: colorData.id,
      size: sizeData.id,
      point: product.point, // Include point valu
      createdAt: new Date(),
      expiresAt: qrCodeExpiry,
    };

    // Generate QR Code image with the ID included
    const qrCodeImageBase64 = await generateQRCode(qrCodeData);

    // Update the QR Code entry with the final data
    await prisma.prv_QRCode.update({
      where: { id: newQrCode.id },
      data: {
        code: JSON.stringify(qrCodeData),
        imageBase64: qrCodeImageBase64,
      },
    });

    // Record the transaction history
    await prisma.prv_History.create({
      data: {
        userId: user.id,
        productId: productId,
        productStockId: productStock.id,
        qrCodeId: newQrCode.id,
        status: "pending",
        transactionDate: new Date(),
      },
    });

    // Respond with the QR Code image, expiry, and qrCodeId
    res.status(200).json({
      qrCodeImage: qrCodeImageBase64,
      qrCodeExpiry: qrCodeExpiry,
      qrCodeId: newQrCode.id, // Include qrCodeId in the response
    });
  } catch (error) {
    console.error("Error generating QR Code:", error);
    res.status(500).json({ error: "Failed to generate QR Code." });
  }
};











      
       
      
      
  
  