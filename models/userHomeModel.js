const mongoose = require("mongoose");

const userHomeSchema = new mongoose.Schema({
  offerTag: { type: String, required: false },
  sliderImages: {
    slider1: { type: String, required: false },
    slider2: { type: String, required: false },
    slider3: { type: String, required: false },
    slider4: { type: String, required: false }
  }
});

module.exports = mongoose.model("UserHome", userHomeSchema);