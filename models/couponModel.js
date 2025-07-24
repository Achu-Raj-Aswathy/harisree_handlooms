const mongoose = require("mongoose");

const couponSchema = mongoose.Schema(
  {
    couponId: { type: String, unique: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    code: { type: String, required: true },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categories",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Products",
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Future Plan"],
    },
    discountPercentage: { type: Number, required: true },
  },
  { timestamps: true }
);

couponSchema.pre("save", async function (next) {
  if (!this.couponId) {
    const randomNumbers = Math.floor(1000 + Math.random() * 9000); // Ensures a 4-digit number
    this.couponId = `CID-${randomNumbers}`;
  }
});

module.exports = mongoose.model("Coupons", couponSchema);
