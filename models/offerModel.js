const mongoose = require("mongoose");

const offerSchema = mongoose.Schema(
  {
    offerId: { type: String, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    discountPercentage: { type: Number, required: true },
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
    image: { type: String, required: true },
  },
  { timestamps: true }
);

offerSchema.pre("save", async function (next) {
  if (!this.offerId) {
    const randomNumbers = Math.floor(1000 + Math.random() * 9000); // Ensures a 4-digit number
    this.offerId = `OffID-${randomNumbers}`;
  }
});

module.exports = mongoose.model("Offers", offerSchema);
