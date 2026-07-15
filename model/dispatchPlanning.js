import mongoose from "mongoose";

const dispatchPlanningSchema = new mongoose.Schema({
  salesOrder: { type: mongoose.Schema.Types.ObjectId, ref: "SalesOrder", required: true },
  orderNo: { type: String },
  plannedDate: { type: Date, required: true },
  items: [
    {
      partNo: { type: mongoose.Schema.Types.ObjectId, ref: "PartNo" },
      partNoName: { type: String },
      quantity: { type: Number, required: true },
      packingType: { type: String },
    },
  ],
  transporterName: { type: String },
  vehicleNo: { type: String },
  status: {
    type: String,
    enum: ["Planned", "InProgress", "Completed"],
    default: "Planned",
  },
  remarks: { type: String },
}, { timestamps: true });

const DispatchPlanning = mongoose.model("DispatchPlanning", dispatchPlanningSchema);
export default DispatchPlanning;
