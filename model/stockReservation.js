import mongoose from "mongoose";

const stockReservationSchema = new mongoose.Schema({
  salesOrder: { type: mongoose.Schema.Types.ObjectId, ref: "SalesOrder", required: true },
  orderNo: { type: String },
  partNo: { type: mongoose.Schema.Types.ObjectId, ref: "PartNo" },
  partNoName: { type: String },
  reservedQty: { type: Number, required: true },
  reservedDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["Reserved", "Released", "Dispatched"],
    default: "Reserved",
  },
  reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  reservedByName: { type: String },
  remarks: { type: String },
}, { timestamps: true });

const StockReservation = mongoose.model("StockReservation", stockReservationSchema);
export default StockReservation;
