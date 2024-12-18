import AWS from "aws-sdk";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

export const uploadFileToS3 = async (file) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `uploads/${Date.now()}-${file.originalname}`, // เก็บไฟล์ในโฟลเดอร์ uploads
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: "public-read", // ตั้งค่าให้ไฟล์สามารถเข้าถึงแบบสาธารณะ
  };

  const uploadResult = await s3.upload(params).promise();
  return uploadResult.Location; // URL ของไฟล์ใน S3
};
