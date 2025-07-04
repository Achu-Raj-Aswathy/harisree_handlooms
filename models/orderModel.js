const mongoose = require("mongoose");

const orderSchema = mongoose.Schema(
  {
    orderId: { type: String, unique: true },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Products",
      required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true,
    },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "cancelled", "shipped", "delivered"],
    },
  },
  { timestamps: true }
);

orderSchema.pre("save", async function (next) {
  if (!this.orderId) {
    const randomNumbers = Math.floor(1000 + Math.random() * 9000); // Ensures a 4-digit number
    this.orderId = `OrdID-${randomNumbers}`;
  }
});

module.exports = mongoose.model("Orders", orderSchema);
