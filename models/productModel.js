const mongoose = require("mongoose");

const productSchema = mongoose.Schema(
  {
    productId: { type: String, unique: true },
    name: { type: String, required: true },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categories",
      required: true,
    },
    images: [
      {
        type: String,
        required: true,
      },
    ],
    price: { type: Number, required: true },
    description: { type: String, required: true },
    stock: { type: Number, default: 0 },
    lowStockLimit: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
    gender: {
      type: String,
      enum: ["Women", "Men", "Girls", "Boys", "Unisex"],
    },
    hsnCode: { type: String },
  },
  { timestamps: true }
);

productSchema.pre("save", async function (next) {
  if (!this.productId) {
    const randomNumbers = Math.floor(1000 + Math.random() * 9000); // Ensures a 4-digit number
    this.productId = `PID-${randomNumbers}`;
  }
});

module.exports = mongoose.model("Products", productSchema);
