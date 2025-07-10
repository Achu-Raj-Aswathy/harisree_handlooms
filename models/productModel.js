const mongoose = require("mongoose");

const productSchema = mongoose.Schema(
  {
    productId: { type: String, unique: true, required: true },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categories",
      required: true,
    },
    name: { type: String, required: true },
    hsnCode: { type: String, required: true },
    price: { type: Number, required: true },
    discount: { type: Number, required: false },
    description: { type: String, required: true },
    stock: { type: Number, default: 0 },
    lowStockLimit: { type: Number, default: 0 },
    skuId: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
    specifications: {
      type: String,
      enum: ["Not Applicable", "With Blouse", "Without Blouse"],
    },
    gender: {
      type: String,
      enum: ["Women", "Men", "Girls", "Boys", "Unisex"],
    },
    size: {
      type: String,
      enum: ["Free Size", "2 meters", "4 meters", "6.25 meters"],
    },
    images: [
      {
        type: String,
        required: true,
      },
    ],
    availableStock:{
      type:Number,
      required:true,
      default:0
    }
  },
  { timestamps: true }
);

// productSchema.pre("save", async function (next) {
//   if (!this.productId) {
//     const randomNumbers = Math.floor(1000 + Math.random() * 9000); // Ensures a 4-digit number
//     this.productId = `PID-${randomNumbers}`;
//   }
// });

module.exports = mongoose.model("Products", productSchema);
