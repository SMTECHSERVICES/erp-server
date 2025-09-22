import mongoose from "mongoose";
import dotenv from 'dotenv'

dotenv.config();




export async function conncectDb() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Database connected')

  // use `await mongoose.connect('mongodb://user:password@127.0.0.1:27017/test');` if your database has auth enabled
}