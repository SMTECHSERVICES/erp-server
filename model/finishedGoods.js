import mongoose from "mongoose";

const finishedGoodsSchema = new mongoose.Schema({
  partNo: { type: mongoose.Schema.Types.ObjectId, ref: "PartNo" },
  partNoName: { type: String },
  quantity: { type: Number, required: true },
  batchNo: { type: String },
  productionOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Production" },
  qualityInspection: { type: mongoose.Schema.Types.ObjectId, ref: "QualityInspection" },
  receivedDate: { type: Date, default: Date.now },
  location: { type: String },
  status: {
    type: String,
    enum: ["Available", "Reserved", "Dispatched"],
    default: "Available",
  },
}, { timestamps: true });

const FinishedGoods = mongoose.model("FinishedGoods", finishedGoodsSchema);
export default FinishedGoods;
