import mongoose from "mongoose";

const dispatchSchema = new mongoose.Schema({
  salesOrder: { type: mongoose.Schema.Types.ObjectId, ref: "SalesOrder", required: true },
  orderNo: { type: String },
  dispatchPlan: { type: mongoose.Schema.Types.ObjectId, ref: "DispatchPlanning" },
  packing: { type: mongoose.Schema.Types.ObjectId, ref: "Packing" },
  dispatchDate: { type: Date, default: Date.now },
  transporterName: { type: String },
  vehicleNo: { type: String },
  lrNo: { type: String }, // Lorry Receipt Number
  eWayBillNo: { type: String },
  items: [
    {
      partNo: { type: mongoose.Schema.Types.ObjectId, ref: "PartNo" },
      partNoName: { type: String },
      quantity: { type: Number },
    },
  ],
  status: {
    type: String,
    enum: ["Dispatched", "InTransit", "Delivered"],
    default: "Dispatched",
  },
  deliveredDate: { type: Date },
  remarks: { type: String },
}, { timestamps: true });

const Dispatch = mongoose.model("Dispatch", dispatchSchema);
export default Dispatch;
