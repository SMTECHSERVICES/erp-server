import mongoose from "mongoose";

const machineProductionSchema = new mongoose.Schema({
  productionOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Production" },
  machineName: { type: String, required: true },
  operator: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  operatorName: { type: String },
  partNo: { type: mongoose.Schema.Types.ObjectId, ref: "PartNo" },
  partNoName: { type: String },
  inputQty: { type: Number, required: true },
  outputQty: { type: Number, default: 0 },
  rejectedQty: { type: Number, default: 0 },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  status: {
    type: String,
    enum: ["Running", "Completed", "Stopped"],
    default: "Running",
  },
  remarks: { type: String },
}, { timestamps: true });

const MachineProduction = mongoose.model("MachineProduction", machineProductionSchema);
export default MachineProduction;
