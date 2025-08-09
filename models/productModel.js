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
    fabric:{ type:String, required:true  },
    colour:{ type:String, required:true },
    design:{ type:String, required:true },
    blouseDetails: {
      type: String,required:true
     
    },
    gender: {
      type: String,
      enum: ["Women", "Men", "Girls", "Boys", "Unisex"],
    },
    length: {
      type: String,
      required:true
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

// Pre-save hook to update isAvailable based on availableStock
productSchema.pre("save", function (next) {
  this.isAvailable = this.availableStock > 0;
  next();
});

// Pre-update hook to ensure availability is updated on update queries
productSchema.pre(["findOneAndUpdate", "updateOne", "updateMany"], function (next) {
  const update = this.getUpdate();
  if (update.$set && update.$set.availableStock !== undefined) {
    update.$set.isAvailable = update.$set.availableStock > 0;
  } else if (update.availableStock !== undefined) {
    update.isAvailable = update.availableStock > 0;
  }
  next();
});

// productSchema.pre("save", async function (next) {
//   if (!this.productId) {
//     const randomNumbers = Math.floor(1000 + Math.random() * 9000); // Ensures a 4-digit number
//     this.productId = `PID-${randomNumbers}`;
//   }
// });

module.exports = mongoose.model("Products", productSchema);
