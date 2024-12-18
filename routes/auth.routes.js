import express from 'express';
import { requestOtp,
         verifyOtp,
         updateStatusAfterOtp
      
         
} from "../middleware/verifyOtp.js";
import {
    addOrUpdateUser,
    getUser,
    getEditUser,
    saveEditUser,
    loginLine,
  

       } from '../middleware/profileUser.js'
import { pdpaAccess,
         pdpaShow,
   } from '../middleware/pdpaUser.js';
import { exportStatusUser,
         getUserStatus

} from '../middleware/statusUser.js'
import { getUserPrivilege,
         getProducts,
         redeemProduct,
         getRedeemedHistory,
         getallreward,
         generateQRCodeProduct
} from '../middleware/privilegeUser.js'

import {  adminLogin,
          allUsers,
          purchaseLicense ,
          addExpense ,
          deleteExpenseWithTransaction,
          addProducts, 
          deleteProduct,
          showExpense,
          deleteExpense,
          getAllProducts,
          approveRedemption,
          approveQRCode
      

} from '../middleware/approveUser.js'
import { body, validationResult } from 'express-validator';
import thaibulksmsApi from 'thaibulksms-api';
import { PrismaClient } from '@prisma/client';



const prisma = new PrismaClient();

const options = {
   apiKey: process.env.API_KEY,
   apiSecret: process.env.API_SECRET,
};

const otp = thaibulksmsApi.otp(options);
const AuthRoutes = express.Router();

AuthRoutes.post('/verify-line-user', body('line_user_id').notEmpty(), async (req, res) => {
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
       return res.status(400).json({ errors: errors.array() });
   }

   try {
       const { line_user_id } = req.body;

       // ค้นหา user ในฐานข้อมูล
       const user = await prisma.prv_Users.findUnique({
           where: { lineUserId: line_user_id },
       });

       if (!user) {
           return res.status(404).json({ error: 'User not found. Please log in again.' });
       }

       const phoneNumber = user.mobile; // สมมติใช้ `mobile` เป็นเบอร์โทรศัพท์

       if (!phoneNumber) {
           return res.status(400).json({ error: 'No phone number found for this user. Please update your profile.' });
       }

       return res.status(200).json({
           message: 'User verified successfully',
           phone_number: phoneNumber,
       });
   } catch (error) {
       console.error('Error in verify-line-user:', error);
       return res.status(500).json({
           message: 'Server error while verifying user',
           error: error.message || error,
       });
   }
});

AuthRoutes.post('/request-otp', body('phone_number').isMobilePhone('th-TH'), async (req, res) => {

   const errors = validationResult(req);
   if (!errors.isEmpty()) {
       return res.status(400).json({ errors: errors.array() });
   }

   try {

       let phoneNumber = req.body.phone_number
       const response = await otp.request(phoneNumber)
       res.json(response.data)

   } catch (error) {
       return res.status(500).json({ errors: error });
   }

})

AuthRoutes.post('/verify-otp', body('token').notEmpty(), body('otp_code').notEmpty(), async (req, res) => {
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
       return res.status(400).json({ errors: errors.array() });
   }

   try {

       let token = req.body.token
       let otpCode = req.body.otp_code
       const response = await otp.verify(token, otpCode)
       res.json(response.data)

   } catch (error) {
       return res.status(500).json({ errors: error });
   }
})
AuthRoutes.post('/update-status-after-otp', updateStatusAfterOtp);

// verify
AuthRoutes.post("/requestotp-e", requestOtp);  // requestotp email
AuthRoutes.post("/verifyotp-e",  verifyOtp);   // verify otpemail

// basic information
AuthRoutes.post('/login-line', loginLine);  // login line and save userid
AuthRoutes.post('/add-or-update', addOrUpdateUser);  // add  or update new user 
AuthRoutes.post('/get-user', getUser); // get  information user
AuthRoutes.get('/get-edit-user', getEditUser); // get information edit user after card
AuthRoutes.post('/save-edit-user', saveEditUser);  // update user information after card  
AuthRoutes.post('/pdpa-access', pdpaAccess);  //  accept pdpa
AuthRoutes.get('/pdpa-show', pdpaShow); // show pdpa accept

// status update for pass to card 
AuthRoutes.get('/export-status-user/:userId', exportStatusUser);  // show status user 1,2,3
AuthRoutes.get('/export-status-user', getUserStatus); // show
// Card user to do everything
AuthRoutes.get('/get-user-privilege', getUserPrivilege);  // show type ,point, exp date
AuthRoutes.get('/get-products', getProducts);  // show product user
AuthRoutes.post('/redeem-product', redeemProduct);  // redeem product user
AuthRoutes.get('/redeem-history-user',getRedeemedHistory ); // redeem history user
AuthRoutes.get('/get-all-reward', getallreward ); // get all reward user
AuthRoutes.post('/generateqrcode-product',generateQRCodeProduct); // generate QR Code product
// admin approve 
AuthRoutes.post('/admin-login', adminLogin); // admin login
AuthRoutes.get('/get-all-user', allUsers);  // add product
AuthRoutes.post('/purchase-license/:userId', purchaseLicense);  // purchase license
AuthRoutes.get('/show-expense/:userId', showExpense);  // show expense user 1,2,3,4,5,6
AuthRoutes.delete('/delete-expense/:expenseId', deleteExpense);
AuthRoutes.post('/add-expense/:userId', addExpense);  // add expense
AuthRoutes.delete('/delete-expense-with-transaction', deleteExpenseWithTransaction);  // delete expense with transaction
AuthRoutes.get('/get-all-product', getAllProducts); // get all
AuthRoutes.post('/add-products', addProducts);  // add product
AuthRoutes.delete('/delete-product/:id', deleteProduct);  // delete product
AuthRoutes.post('/approve-redemption', approveRedemption); //   approve redemption ด้วย  postman
AuthRoutes.post('/approve-qrcode',approveQRCode) // จากการถ่ายจากกล้อง

export default AuthRoutes;