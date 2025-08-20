const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Products",
    required: true
  },
  images: [
    {
      type: String
    }
  ],
  rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
  },
  review: {
    type: String,
    required: false
  },
  date: {
    type: Date,
    default: Date.now,
  },
},
{
  timestamps: true,
}
);

module.exports = mongoose.model("Reviews", reviewSchema);
