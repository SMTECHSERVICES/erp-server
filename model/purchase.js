import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema({
  supplierName: { type: String, required: true },
  supplierGSTIN: { type: String },
  items: [
    {
      partNo: { type: mongoose.Schema.Types.ObjectId, ref: "PartNo" },
      partNoName: { type: String },
      rawMaterialType: { type: String },
      quantity: { type: Number, required: true },
      unitPrice: { type: Number, required: true },
      amount: { type: Number, required: true },
    },
  ],
  totalAmount: { type: Number, required: true },
  purchaseDate: { type: Date, default: Date.now },
  invoiceNo: { type: String },
  status: {
    type: String,
    enum: ["Pending", "Received", "Partial"],
    default: "Pending",
  },
  receivedDate: { type: Date },
  remarks: { type: String },
}, { timestamps: true });

const Purchase = mongoose.model("Purchase", purchaseSchema);
export default Purchase;
