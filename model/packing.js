import mongoose from "mongoose";

const packingSchema = new mongoose.Schema({
  dispatchPlan: { type: mongoose.Schema.Types.ObjectId, ref: "DispatchPlanning" },
  salesOrder: { type: mongoose.Schema.Types.ObjectId, ref: "SalesOrder", required: true },
  orderNo: { type: String },
  items: [
    {
      partNo: { type: mongoose.Schema.Types.ObjectId, ref: "PartNo" },
      partNoName: { type: String },
      quantity: { type: Number, required: true },
      boxNo: { type: String },
      weight: { type: Number },
    },
  ],
  packedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  packedByName: { type: String },
  packedDate: { type: Date, default: Date.now },
  totalBoxes: { type: Number, default: 0 },
  totalWeight: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["Pending", "Packed", "Verified"],
    default: "Pending",
  },
  remarks: { type: String },
}, { timestamps: true });

const Packing = mongoose.model("Packing", packingSchema);
export default Packing;
