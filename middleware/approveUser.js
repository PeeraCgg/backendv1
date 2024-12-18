import express from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { generateQRCode } from '../utils/qrCodeGenerator.js'



const prisma = new PrismaClient();
const router = express.Router();

export const adminLogin =async (req, res) => {
  const { username, password } = req.body;

  try {
    // ค้นหา admin จากฐานข้อมูล
    const admin = await prisma.prv_Admin.findUnique({
      where: { username },
    });

    if (!admin) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // ตรวจสอบรหัสผ่าน
    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    res.status(200).json({ message: "Login successful", admin: { id: admin.id, username: admin.username, role: admin.role } });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const allUsers = async (req, res) => {
  try {
    const users = await prisma.prv_Users.findMany({
      select: {
        id: true,
        firstname: true,
        lastname: true,
        mobile: true, // Select the mobile number
        privileges: {
          select: {
            prvType: true, // Privilege level/type
          },
        },
      },
    });

    // Format the data to include fullname and mobile
    const formattedUsers = users.map((user) => ({
      id: user.id,
      fullname: `${user.firstname || ""} ${user.lastname || ""}`.trim(), // Concatenate firstname and lastname
      mobile: user.mobile || "N/A", // Provide fallback if mobile is not available
      privilegeLevel: user.privileges[0]?.prvType || "No Privilege", // Fallback if no privilege
    }));

    res.status(200).json({
      message: "Users retrieved successfully!",
      users: formattedUsers,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};


export const purchaseLicense = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10); // Get and parse `userId` from params

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid or missing user ID" });
    }

    // Check if the user exists
    const user = await prisma.prv_Users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "ไม่พบข้อมูลผู้ใช้งานในระบบ" });
    }

    // Check if privilege exists for the user
    const privilege = await prisma.prv_Privilege.findFirst({
      where: { userId },
    });

    if (!privilege) {
      return res
        .status(404)
        .json({ error: "ไม่พบ Privilege สำหรับผู้ใช้งานนี้" });
    }

    // Check if the user already purchased the license
    if (privilege.isPurchased) {
      return res.status(400).json({ error: "ผู้ใช้ได้ซื้อ License ไปแล้ว" });
    }

    // Update `isPurchased` and `prvType` in `Prv_Privilege`
    const updatedPrivilege = await prisma.prv_Privilege.update({
      where: { id: privilege.id }, // Use the privilege ID
      data: {
        isPurchased: true,
        prvType: "Privilege", // Set to Privilege type
        prvExpiredDate: new Date(
          new Date().setFullYear(new Date().getFullYear() + 1)
        ), // Set expiration date to 1 year from now
      },
    });

    return res.status(200).json({
      message: "ซื้อ License สำเร็จ",
      data: {
        userId,
        prvType: updatedPrivilege.prvType,
        isPurchased: updatedPrivilege.isPurchased,
        prvExpiredDate: updatedPrivilege.prvExpiredDate,
      },
    });
  } catch (error) {
    console.error("Error purchasing license:", error);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดภายในระบบ" });
  }
};



export const showExpense = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid User ID" });
    }

    // Fetch privilege details
    const privilege = await prisma.prv_Privilege.findFirst({
      where: { userId },
      select: {
        prvType: true,
        prvExpiredDate: true,
        currentAmount: true,
        totalAmountPerYear: true,
        currentPoint: true,
        prvLicenseId: true,
      },
    });

    if (!privilege) {
      return res.status(404).json({ error: "Privilege not found for this user." });
    }

    // Fetch expense history
    const expenses = await prisma.prv_Total_Expense.findMany({
      where: { userId },
      orderBy: { transactionDate: "desc" },
      select: {
        id: true,
        expenseAmount: true,
        transactionDate: true,
        prvType: true,
        expensePoint: true,
      },
    });

    // Check for no expenses
    if (expenses.length === 0) {
      return res.status(200).json({
        message: "No expenses found for this user",
        data: {
          totalAmountPerYear: privilege.totalAmountPerYear,
          prvType: privilege.prvType,
          expenses: [],
        },
      });
    }

    res.status(200).json({
      message: "Expense history retrieved successfully",
      data: {
        totalAmountPerYear: privilege.totalAmountPerYear,
        prvType: privilege.prvType,
        currentPoint: privilege.currentPoint,
        expenses,
      },
    });
  } catch (error) {
    console.error("Error retrieving expense history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

  
  export const addExpense = async (req, res) => {
    try {
      const expenseAmount = parseFloat(req.body.expenseAmount); // Ensure numeric input
      const transactionDate = req.body.transactionDate;
      const userId = parseInt(req.params.userId, 10); // Correctly parse userId
  
      if (!userId || isNaN(expenseAmount) || !transactionDate) {
        return res.status(400).json({ error: 'All fields are required' });
      }
  
      // Check for privilege
      const privilege = await prisma.prv_Privilege.findFirst({
        where: { userId },
      });
  
      if (!privilege) {
        return res.status(404).json({ error: 'Privilege not found for this user.' });
      }
  
      // Calculate totalAmountPerYear
      const updatedTotalAmountPerYear = privilege.totalAmountPerYear + expenseAmount;
  
      // Update privilege type
      let updatedPrvType = privilege.prvType;
      if (privilege.prvType !== 'Privilege') {
        if (updatedTotalAmountPerYear < 100000) {
          updatedPrvType = 'Gold';
        } else if (updatedTotalAmountPerYear < 150000) {
          updatedPrvType = 'Platinum';
        } else {
          updatedPrvType = 'Diamond';
        }
      }
  
      // Handle Privilege type expiration
      if (privilege.prvType === 'Privilege' && privilege.prvExpiredDate) {
        const now = new Date();
        const oneYearLater = new Date(privilege.prvExpiredDate);
        if (now <= oneYearLater) {
          updatedPrvType = 'Privilege';
        }
      }
  
      // Calculate new points based on updated privilege type
      const pointRates = { Privilege: 120, Diamond: 160, Platinum: 180, Gold: 200 };
      const rate = pointRates[updatedPrvType] || pointRates['Gold'];
      const totalAmount = privilege.currentAmount + expenseAmount;
      const pointsEarned = Math.floor(totalAmount / rate);
      const remainingAmount = totalAmount % rate;
  
      // Save the expense
      const expense = await prisma.prv_Total_Expense.create({
        data: {
          userId,
          expenseAmount,
          transactionDate: new Date(transactionDate),
          prvType: updatedPrvType,
          expensePoint: pointsEarned,
        },
      });
  
      // Update privilege
      const updatedPrivilege = await prisma.prv_Privilege.update({
        where: { id: privilege.id },
        data: {
          currentAmount: remainingAmount,
          totalAmountPerYear: updatedTotalAmountPerYear,
          prvType: updatedPrvType,
          currentPoint: privilege.currentPoint + pointsEarned,
        },
      });
  
      res.json({
        message: 'Expense added successfully!',
        expense,
        privilege: updatedPrivilege,
      });
    } catch (error) {
      console.error('Error adding expense:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  
export const deleteExpenseWithTransaction = async (req, res) => {
    try {
      const { expenseId } = req.body;
  
      const expense = await prisma.$transaction(async (prisma) => {
        const expense = await prisma.prv_Total_Expense.findUnique({
          where: { id: expenseId },
        });
  
        if (!expense) {
          throw new Error('Expense not found.');
        }
  
        const privilege = await prisma.prv_Privilege.findFirst({
          where: { userId: expense.userId },
        });
  
        if (!privilege) {
          throw new Error('Privilege not found.');
        }
  
        const updatedTotalAmountPerYear = privilege.totalAmountPerYear - expense.expenseAmount;
        const updatedCurrentAmount = privilege.currentAmount - (expense.expenseAmount % 150);
        const updatedPoints = privilege.currentPoint - expense.expensePoint;
  
        await prisma.prv_Privilege.update({
          where: { id: privilege.id },
          data: {
            totalAmountPerYear: updatedTotalAmountPerYear,
            currentAmount: Math.max(updatedCurrentAmount, 0),
            currentPoint: Math.max(updatedPoints, 0),
          },
        });
  
        await prisma.prv_Total_Expense.delete({
          where: { id: expenseId },
        });
  
        return expense;
      });
  
      res.json({ message: 'Expense deleted successfully.', expense });
    } catch (error) {
      console.error('Error in transaction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  export const deleteExpense = async (req, res) => {
    const { expenseId } = req.params; // Get expenseId from URL
  
    if (!expenseId) {
      return res.status(400).json({ error: 'Expense ID is required' });
    }
  
    try {
      // Check if the expense exists
      const expense = await prisma.prv_Total_Expense.findUnique({
        where: { id: parseInt(expenseId, 10) },
      });
  
      if (!expense) {
        return res.status(404).json({ error: 'Expense not found.' });
      }
  
      const userId = expense.userId;
  
      // Fetch the user's privilege
      const privilege = await prisma.prv_Privilege.findFirst({
        where: { userId },
      });
  
      if (!privilege) {
        return res.status(404).json({ error: 'Privilege not found for this user.' });
      }
  
      // Calculate updated values
      const updatedTotalAmountPerYear = privilege.totalAmountPerYear - expense.expenseAmount;
      const updatedCurrentPoint = privilege.currentPoint - expense.expensePoint;
  
      // Determine the new privilege type
      let updatedPrvType = privilege.prvType;
  
      if (privilege.prvType !== 'Privilege') {
        if (updatedTotalAmountPerYear < 100000) {
          updatedPrvType = 'Gold';
        } else if (updatedTotalAmountPerYear < 150000) {
          updatedPrvType = 'Platinum';
        } else {
          updatedPrvType = 'Diamond';
        }
      }
  
      // Handle Privilege type expiration
      if (privilege.prvType === 'Privilege' && privilege.prvExpiredDate) {
        const now = new Date();
        const oneYearLater = new Date(privilege.prvExpiredDate);
        if (now <= oneYearLater) {
          updatedPrvType = 'Privilege';
        }
      }
  
      // Delete the expense
      await prisma.prv_Total_Expense.delete({
        where: { id: parseInt(expenseId, 10) },
      });
  
      // Update the privilege
      const updatedPrivilege = await prisma.prv_Privilege.update({
        where: { id: privilege.id },
        data: {
          totalAmountPerYear: updatedTotalAmountPerYear >= 0 ? updatedTotalAmountPerYear : 0,
          currentPoint: updatedCurrentPoint >= 0 ? updatedCurrentPoint : 0,
          prvType: updatedPrvType,
        },
      });
  
      res.status(200).json({
        message: 'Expense deleted successfully and privilege updated',
        updatedPrivilege,
      });
    } catch (error) {
      console.error('Error deleting expense:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  export const getAllProducts = async (req, res) => {
    try {
      const products = await prisma.product.findMany({
        include: {
          ProductStock: {
            include: {
              color: true,
              size: true,
            },
          },
        },
        orderBy: { point: 'desc' },
      });
  
      if (products.length === 0) {
        return res.status(404).json({ success: false, message: "No products found" });
      }
  
      res.status(200).json({ success: true, products });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ success: false, error: "Failed to fetch products" });
    }
  };
  
  
  
  
export const addProducts = async (req, res) => {
    try {
      const { products } = req.body;
  
      if (!products || !Array.isArray(products)) {
        return res.status(400).json({ error: 'Products must be an array.' });
      }
  
      const createdProducts = [];
  
      for (const product of products) {
        const { name, description, point, imagepath, combinations } = product;
  
        if (!name || !description || !point || !Array.isArray(combinations)) {
          throw new Error(
            'Each product must have a name, description, point, and combinations (array).'
          );
        }
  
        // Check if the product already exists
        const existingProduct = await prisma.product.findFirst({
          where: { name }, // ค้นหาตามชื่อ (ไม่ต้องเป็น unique)
        });
  
        let createdProduct;
        if (existingProduct) {
          console.log(`Product "${name}" already exists. Skipping creation.`);
          createdProduct = existingProduct;
        } else {
          // Step 1: Create the product
          createdProduct = await prisma.product.create({
            data: {
              name,
              description,
              point,
              imagepath,
            },
          });
        }
  
        const productId = createdProduct.id;
  
        // Step 2: Handle combinations (color, size, stock)
        const createdCombinations = [];
        for (const combination of combinations) {
          const { color, size, barcode, quantity } = combination;
  
          if (!color || !size || !barcode || !quantity) {
            throw new Error(
              'Each combination must have a color, size, barcode, and quantity.'
            );
          }
  
          // Ensure the color exists in ProductType
          const colorOption = await prisma.productType.upsert({
            where: { type: color }, // ต้องมี @unique ใน `type`
            create: {
              type: color,
              description: `${color} color option`,
            },
            update: {},
          });
  
          // Ensure the size exists in ProductType
          const sizeOption = await prisma.productType.upsert({
            where: { type: size }, // ต้องมี @unique ใน `type`
            create: {
              type: size,
              description: `${size} size option`,
            },
            update: {},
          });
  
          // Check if the stock combination already exists
          const existingStock = await prisma.productStock.findFirst({
            where: {
              productId,
              colorId: colorOption.id,
              sizeId: sizeOption.id,
            },
          });
  
          if (existingStock) {
            console.log(
              `Stock for "${name}" (${color} - ${size}) already exists. Skipping creation.`
            );
            createdCombinations.push(existingStock);
            continue;
          }
  
          // Generate QR Code for stock
          const qrCodeData = {
            barcode,
            name: `${name} (${color} - ${size})`,
            productId,
            color,
            size,
          };
  
          const stockQrCode = await generateQRCode(qrCodeData); // Generate QR Code
  
          // Create the stock entry for this combination
          const createdStock = await prisma.productStock.create({
            data: {
              itemCode: `${name}-${color}-${size}`, // Example item code
              name: `${name} (${color} - ${size})`,
              description: `Stock for ${name} with color ${color} and size ${size}`,
              colorId: colorOption.id,
              sizeId: sizeOption.id,
              barcode,
              stockQrCode,
              productId,
              quantity,
            },
          });
  
          createdCombinations.push(createdStock);
        }
  
        createdProducts.push({
          product: createdProduct,
          combinations: createdCombinations,
        });
      }
  
      res.status(201).json({
        message: 'Products added successfully!',
        createdProducts,
      });
    } catch (error) {
      console.error('Error adding products:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  };
  

  export const deleteProduct = async (req, res) => {
    try {
      const { id } = req.params;
  
      if (!id) {
        return res.status(400).json({ error: 'Product ID is required.' });
      }
  
      // Check if the product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id: parseInt(id, 10) },
      });
  
      if (!existingProduct) {
        return res.status(404).json({ error: 'Product not found.' });
      }
  
      // Check if the product has been redeemed
      const redemptionExists = await prisma.prv_History.findFirst({
        where: { productId: parseInt(id, 10) },
      });
  
      if (redemptionExists) {
        return res.status(400).json({
          error: 'Cannot delete product. This product has been redeemed by a customer.',
        });
      }
  
      // Delete the product
      await prisma.product.delete({
        where: { id: parseInt(id, 10) },
      });
  
      res.status(200).json({
        message: 'Product deleted successfully!',
        productId: id,
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  


 // ตรวจสอบ qrcode
  export const approveRedemption = async (req, res) => {
  try {
    const { qrCode } = req.body;

    // Validate required parameters
    if (!qrCode) {
      return res.status(400).json({ error: 'QR Code is required.' });
    }

    // Fetch QR Code data
    const qrCodeRecord = await prisma.prv_QRCode.findFirst({
      where: { code: qrCode, status: 'active' },
      include: {
        history: true, // Include associated history
      },
    });

    if (!qrCodeRecord) {
      return res.status(404).json({ error: 'QR Code not found or already used.' });
    }

    // Check if QR Code is expired
    if (new Date() > new Date(qrCodeRecord.expiresAt)) {
      return res.status(400).json({ error: 'QR Code has expired.' });
    }

    // Fetch the associated history record
    const historyRecord = await prisma.prv_History.findFirst({
      where: { qrCodeId: qrCodeRecord.id },
    });

    if (!historyRecord) {
      return res.status(404).json({ error: 'Associated history not found.' });
    }

    // Update QR Code status to 'used'
    await prisma.prv_QRCode.update({
      where: { id: qrCodeRecord.id },
      data: { status: 'used' },
    });

    // Update history status to 'approved'
    await prisma.prv_History.update({
      where: { id: historyRecord.id },
      data: { status: 'approved', transactionDate: new Date() },
    });

    res.status(200).json({ message: 'Redemption approved successfully.' });
  } catch (error) {
    console.error('Error approving redemption:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveQRCode = async (req, res) => {
  const { qrCodeId } = req.body;

  if (!qrCodeId) {
    return res.status(400).json({ error: "Missing QR Code ID." });
  }

  try {
    console.log("Approving QR Code ID:", qrCodeId);

    const result = await prisma.$transaction(async (prisma) => {
      const qrCodeEntry = await prisma.prv_QRCode.findUnique({
        where: { id: parseInt(qrCodeId, 10) },
      });

      if (!qrCodeEntry) {
        throw new Error("QR Code not found.");
      }

      // ตรวจสอบสถานะ QR Code
      if (qrCodeEntry.status !== "active") {
        // หากถูกสแกนไปแล้วเมื่อเร็วๆ นี้ (เช่น ภายใน 10 วินาที)
        const now = new Date();
        if (qrCodeEntry.lastScannedAt && now - new Date(qrCodeEntry.lastScannedAt) < 10000) {
          return { alreadyScanned: true, message: "QR Code has already been used or is not active." };
        }

        // อัปเดต lastScannedAt เพื่อบันทึกการสแกนซ้ำ
        await prisma.prv_QRCode.update({
          where: { id: parseInt(qrCodeId, 10) },
          data: { lastScannedAt: now },
        });

        throw new Error("QR Code has already been used or is not active.");
      }

      // ตรวจสอบวันหมดอายุ
      if (new Date() > new Date(qrCodeEntry.expiresAt)) {
        throw new Error("QR Code has expired.");
      }

      // Parse QR Code data
      let qrCodeData;
      try {
        qrCodeData = JSON.parse(qrCodeEntry.code);
      } catch (err) {
        throw new Error("QR Code data is invalid or corrupted.");
      }

      // Fetch user privilege
      const privilege = await prisma.prv_Privilege.findFirst({
        where: {
          user: { lineUserId: qrCodeData.lineUserId },
        },
      });

      if (!privilege) {
        throw new Error("Privilege not found for user.");
      }

      if (privilege.currentPoint < qrCodeData.point) {
        throw new Error("Insufficient points.");
      }

      const updatedPrivilege = await prisma.prv_Privilege.update({
        where: { id: privilege.id },
        data: { currentPoint: privilege.currentPoint - qrCodeData.point },
      });

      const productStock = await prisma.productStock.findFirst({
        where: {
          productId: qrCodeData.productId,
          colorId: qrCodeData.color,
          sizeId: qrCodeData.size,
        },
      });

      if (!productStock || productStock.quantity <= 0) {
        throw new Error("Product out of stock.");
      }

      // อัปเดตสถานะ QR Code
      const updatedQRCode = await prisma.prv_QRCode.updateMany({
        where: {
          id: parseInt(qrCodeId, 10),
          status: "active",
        },
        data: { status: "used", lastScannedAt: new Date() },
      });

      if (updatedQRCode.count === 0) {
        throw new Error("QR Code has already been used or modified.");
      }

      // อัปเดตจำนวนสินค้า
      const updatedStock = await prisma.productStock.update({
        where: { id: productStock.id },
        data: { quantity: productStock.quantity - 1 },
      });

      await prisma.prv_History.updateMany({
        where: { qrCodeId: parseInt(qrCodeId, 10), status: "pending" },
        data: { status: "approved", transactionDate: new Date() },
      });

      return {
        updatedStock: updatedStock.quantity,
        remainingPoints: updatedPrivilege.currentPoint,
      };
    });

    if (result?.alreadyScanned) {
      return res.status(200).json({ message: result.message });
    }

    res.status(200).json({
      message: "QR Code approved successfully!",
      updatedStock: result.updatedStock,
      remainingPoints: result.remainingPoints,
    });
  } catch (error) {
    console.error("Error approving QR Code:", error);

    if (error.message.includes("QR Code not found")) {
      return res.status(404).json({ error: "QR Code not found." });
    }
    if (error.message.includes("already been used")) {
      return res.status(400).json({ error: "QR Code has already been used or is not active." });
    }
    if (error.message.includes("QR Code has expired")) {
      return res.status(400).json({ error: "QR Code has expired." });
    }
    if (error.message.includes("Privilege not found for user")) {
      return res.status(404).json({ error: "Privilege not found for user." });
    }
    if (error.message.includes("Insufficient points")) {
      return res.status(400).json({ error: "Insufficient points." });
    }
    if (error.message.includes("Product out of stock")) {
      return res.status(400).json({ error: "Product out of stock." });
    }

    return res.status(500).json({ error: "Failed to approve QR Code." });
  }
};



















  
  
  
  
  
 


