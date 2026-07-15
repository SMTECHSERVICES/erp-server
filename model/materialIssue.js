import mongoose from "mongoose";

const materialIssueSchema = new mongoose.Schema({
  productionOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Production" },
  partNo: { type: mongoose.Schema.Types.ObjectId, ref: "PartNo" },
  partNoName: { type: String },
  rawMaterialType: { type: String },
  issuedQuantity: { type: Number, required: true },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  issuedByName: { type: String },
  issuedDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["Issued", "Returned", "Consumed"],
    default: "Issued",
  },
  remarks: { type: String },
}, { timestamps: true });

const MaterialIssue = mongoose.model("MaterialIssue", materialIssueSchema);
export default MaterialIssue;
