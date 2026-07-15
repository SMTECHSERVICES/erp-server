import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  salesOrder: { type: mongoose.Schema.Types.ObjectId, ref: "SalesOrder" },
  orderNo: { type: String },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
  customerName: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },
  paymentDate: { type: Date, default: Date.now },
  paymentMode: {
    type: String,
    enum: ["Cash", "Bank Transfer", "Cheque", "UPI", "Other"],
    default: "Bank Transfer",
  },
  referenceNo: { type: String },
  status: {
    type: String,
    enum: ["Pending", "Partial", "Paid"],
    default: "Pending",
  },
  remarks: { type: String },
}, { timestamps: true });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
