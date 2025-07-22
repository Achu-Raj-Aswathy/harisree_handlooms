const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },

    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Products",
          required: true,
        },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }, // price per unit at time of purchase
        subtotal: { type: Number, required: true } // quantity * price
      }
    ],

    shippingCharge: { type: Number, default: 0 },
    discount: { type: Number, default: 0 }, // coupon discount value
    total: { type: Number, required: true }, // final total (subtotal + shipping - discount)

    paymentMethod: { type: String, required: true },
    paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },

    status: {
      type: String,
      enum: ["Pending", "Cancelled", "Shipped", "Delivered", "Returned"],
      default: "Pending"
    },

    address: {
      name: String,
      phone: String,
      email: String,
      state: String,
      city: String,
      pincode: String,
      line: String,
    }
  },
  { timestamps: true }
);

orderSchema.pre("save", async function (next) {
  if (!this.orderId) {
    const randomNumbers = Math.floor(1000 + Math.random() * 9000);
    this.orderId = `ORD-${randomNumbers}`;
  }
  next();
});

module.exports = mongoose.model("Orders", orderSchema);
