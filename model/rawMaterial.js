import mongoose from "mongoose";

const rawMaterialSchema = new mongoose.Schema({
    type:{
        type:String,
        unique:true,
    required:true,
    enum:["Pipe","Round Bar"]
    },
    quantity:{
        type:Number,
        default:0
    },
    stockMovements: [                                          
    {
      type: { type: String, enum: ['IN', 'OUT'], required: true },
      quantity: { type: Number, required: true },
      reason: { type: String },
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
      date: { type: Date, default: Date.now }
    }
  ]

})

const RawMaterial = mongoose.model("RawMaterial",rawMaterialSchema);
export default RawMaterial;