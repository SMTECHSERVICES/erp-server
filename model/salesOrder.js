import mongoose from "mongoose";

const salesOrderSchema = new mongoose.Schema({
  orderNo: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  customerGSTIN: { type: String },
  customerContact: { type: String },
  customerAddress: { type: String },
  items: [
    {
      partNo: { type: mongoose.Schema.Types.ObjectId, ref: "PartNo" },
      partNoName: { type: String },
      quantity: { type: Number, required: true },
      unitPrice: { type: Number, required: true },
      amount: { type: Number, required: true },
    },
  ],
  totalAmount: { type: Number, required: true },
  orderDate: { type: Date, default: Date.now },
  expectedDeliveryDate: { type: Date },
  status: {
    type: String,
    enum: ["Pending", "Confirmed", "Processing", "Dispatched", "Delivered", "Cancelled"],
    default: "Pending",
  },
  remarks: { type: String },
}, { timestamps: true });

const SalesOrder = mongoose.model("SalesOrder", salesOrderSchema);
export default SalesOrder;
