const mongoose = require("mongoose");

const categorySchema = mongoose.Schema(
  {
    categoryId: { type: String, unique: true ,required:true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    images: [
      { type: String, required: true }
    ]
  },
  { timestamps: true }
);

// categorySchema.pre("save", async function (next) {
//   if (!this.categoryId) {
//     const randomNumbers = Math.floor(1000 + Math.random() * 9000); // Ensures a 4-digit number
//     this.categoryId = `CatID-${randomNumbers}`;
//   }
// });

module.exports = mongoose.model("Categories", categorySchema);
