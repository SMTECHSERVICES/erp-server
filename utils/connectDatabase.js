import mongoose from "mongoose";




export async function conncectDb() {
  await mongoose.connect('mongodb://127.0.0.1:27017/erp');
  console.log('Database connected')

  // use `await mongoose.connect('mongodb://user:password@127.0.0.1:27017/test');` if your database has auth enabled
}