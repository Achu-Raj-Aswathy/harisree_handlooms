const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = mongoose.Schema(
  {
    userId: { type: String, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
    mobile: { type: Number, required: false },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    address: [
      {
        billing: {
          name: { type: String, required: false },
          addressLine: { type: String, required: false },
          city: { type: String, required: false },
          state: { type: String, required: false },
          country: { type: String, required: false },
          pincode: { type: String, required: false },
          phone: { type: String, required: false }
        },
        shipping: {
          name: { type: String, required: false },
          addressLine: { type: String, required: false },
          city: { type: String, required: false },
          state: { type: String, required: false },
          country: { type: String, required: false },
          pincode: { type: String, required: false },
          phone: { type: String, required: false }
        }
      }
    ],
    orders: [
      {
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Orders",
          required: false,
        },
      },
    ],
    wishlist: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Products",
          required: false,
        },
      },
    ],
    cart: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Products",
          required: false,
        },
        quantity: {
          type: Number,
          required: false,
        }
      },
    ], 
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.userId) {
    const randomNumbers = Math.floor(1000 + Math.random() * 9000); // Ensures a 4-digit number
    this.userId = `UID-${randomNumbers}`;
  }

  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model("Users", userSchema);
