import mongoose from "mongoose";



const invoiceSchema = new mongoose.Schema({
  date: Date,
  url: String,
  publicId: String,
}, { timestamps: true });

const Invoice = mongoose.model("Invoice",invoiceSchema);

export default Invoice;