import mongoose from "mongoose";

const qualityInspectionSchema = new mongoose.Schema({
  productionOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Production" },
  machineProduction: { type: mongoose.Schema.Types.ObjectId, ref: "MachineProduction" },
  partNo: { type: mongoose.Schema.Types.ObjectId, ref: "PartNo" },
  partNoName: { type: String },
  inspectedQty: { type: Number, required: true },
  passedQty: { type: Number, default: 0 },
  rejectedQty: { type: Number, default: 0 },
  inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  inspectedByName: { type: String },
  inspectionDate: { type: Date, default: Date.now },
  defectReasons: [
    {
      reason: { type: String },
      quantity: { type: Number },
    },
  ],
  status: {
    type: String,
    enum: ["Pending", "Passed", "Failed", "Partial"],
    default: "Pending",
  },
  remarks: { type: String },
}, { timestamps: true });

const QualityInspection = mongoose.model("QualityInspection", qualityInspectionSchema);
export default QualityInspection;
