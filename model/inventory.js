import mongoose from "mongoose";

// models/InventoryItem.js
const inventoryItemSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true }, // 👈 Manual ID from client
  name: { type: String, required: true },                    // 👈 Human-readable name
  category: { type: String },                                // 👈 Raw Material, Finished Good, etc.
  //location: { type: String },                                // 👈 Where it's stored
  quantity: { type: Number, default: 0 },                    // 👈 Current stock
  unit: { type: String, default: 'pcs' },                    // 👈 Units (e.g. meters, pcs)
  minStock: { type: Number, default: 50 },                    // 👈 Alert if quantity < this
  stockMovements: [                                          // 👇 Tracks every change in quantity
    {
      type: { type: String, enum: ['IN', 'OUT'], required: true },
      quantity: { type: Number, required: true },
      reason: { type: String },
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
      date: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });


const Inventory = mongoose.model("Inventory",inventoryItemSchema);

export default Inventory;