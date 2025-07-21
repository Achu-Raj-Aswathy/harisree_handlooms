const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Products",
  },
  rating: Number,
  comment: String,
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Reviews", reviewSchema);
