import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from "fs";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary



// 🔹 Convert file to Base64
// function fileToBase64(filePath) {
//   const fileData = fs.readFileSync(filePath); // read file as buffer
//   return `data:${getMimeType(filePath)};base64,${fileData.toString("base64")}`;
// }

// // 🔹 Helper to guess mime-type
// function getMimeType(filePath) {
//   if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
//   if (filePath.endsWith(".png")) return "image/png";
//   if (filePath.endsWith(".pdf")) return "application/pdf";
//   return "application/octet-stream"; // fallback
// }

// // 🔹 Upload Base64 string to Cloudinary
// async function uploadToCloudinary(filePath) {
//   try {
//     const base64String = fileToBase64(filePath);

//     const result = await cloudinary.uploader.upload(base64String, {
//       resource_type: "auto", // auto-detects image/pdf/video
//       folder: "uploads", // optional: put files inside "uploads/"
//     });

//     return {
//       secure_url: result.secure_url,
//       public_id: result.public_id,
//     };
//   } catch (err) {
//     console.error("Cloudinary Upload Error:", err);
//     throw err;
//   }
// }

// // 🔹 Example usage

// export default uploadToCloudinary
