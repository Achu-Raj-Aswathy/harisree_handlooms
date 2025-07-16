const mongoose = require("mongoose");

const requestSchema = mongoose.Schema(
  {
    reqId: { type: String, unique: true },
    orderId: { type: String, required: true },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true,
    },
    productName: { type: String, required: true },
    dateOfProduct: { type: Date, required: true },
    reason: {
      type: String,
      required : true
    },
    image: { type: String, required: true },
    status: { type: String, 
      enum:["Pending", "Approved", "Rejected"],
      default: "Pending"
    }
  },
  { timestamps: true }
);

requestSchema.pre("save", async function (next) {
  if (!this.reqId) {
    const randomNumbers = Math.floor(1000 + Math.random() * 9000); // Ensures a 4-digit number
    this.reqId = `ReqID-${randomNumbers}`;
  }
});

module.exports = mongoose.model("Requests", requestSchema);
