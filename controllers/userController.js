const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Users = require("../models/userModel");
const { countries } = require('countries-list');
const UserHome = require("../models/userHomeModel");
const Products = require("../models/productModel");
const Offers = require("../models/offerModel")
const Categories = require("../models/categoryModel");

// const viewHomepage = async (req, res) => {
//   try {
//     const homeEdits = await UserHome.find({}, { sliderImages: 1, _id: 0 });
//     const products = await Products.find();
//     const newArrivals = await Products.find().sort({ createdAt: -1 });
//     // const offersArea = 
//     // const bestDeals = await Products.find()
//     res.render("user/home", { sliderImages: homeEdits[0]?.sliderImages || {}, products, newArrivals }); 
//   } catch (error) {
//     console.error(error);
//     res.render("error", { error });
//   }
// };

const viewHomepage = async (req, res) => {
  try {
    const homeEdits = await UserHome.find({}, { sliderImages: 1, _id: 0 });
    const products = await Products.find();
    const newArrivals = await Products.find().sort({ createdAt: -1 });
    let userWishlistProductIds = [];

    if (req.session.user) {
  const user = await Users.findById(req.session.user);
  userWishlistProductIds = user?.wishlist?.map(item => item.productId.toString()) || [];
}

    // Get all products with offers (for offers area)
    const offersArea = await Offers.find()
      .populate("productId")
      .sort({ createdAt: -1 });

    // Filter for best deals (only those active today)
    const today = new Date();
    const bestDeals = await Offers.find({
      startDate: { $lte: today },
      endDate: { $gte: today }
    })
      .populate("productId")
      .sort({ discountPercentage: -1 }); // Highest discount first

    res.render("user/home", {
      sliderImages: homeEdits[0]?.sliderImages || {},
      products,
      newArrivals,
      offersArea,
      bestDeals,
      userWishlistProductIds
    });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewSignin = async (req, res) => {
  try {
    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    res.render("user/signin", { message: "", messageType:"" });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewSignup = async (req, res) => {
  try {
    res.render("user/signup", { message: "" });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const signUp = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      return res.render("user/signup", {
        message: "Password does not match",
        messageType: "danger",
      });
    }

    // Check if the email already exists
    const existingUserByEmail = await Users.findOne({ email });
    if (existingUserByEmail) {
      return res.render("user/signup", {
        message: "User with this email already exists",
        messageType: "danger",
      });
    }

    // Step 2: Create the user and reference the subscription
    const newUser = new Users({
      name: name,
      email: email,
      password: password,
    });
    
    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.SECRET_KEY, {
      expiresIn: "7d",
    });

    return res.redirect("/signin");
  } catch (error) {
    console.error(error);
    return res.render("user/signup", {
      message: "An error occurred during signup.",
      messageType: "danger",
    }); // Send error to user.
  }
};

const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await Users.findOne({ email });
    if (!user)
      return res.render("user/signin", {
        message: "Username or Password does not match",
        messageType: "danger",
      });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.render("user/signin", {
        message: "Username or Password does not match",
        messageType: "danger",
      });

    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
      expiresIn: "7d",
    });

    req.session.token = token;
    req.session.user = user._id;

    res.redirect("/");
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const signOut = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const viewForgotPassword = async (req, res) => {
  try {
    res.render("user/forgotPassword", { message: "" });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewResetPassword = async (req, res) => {
  const token = req.query.token;
  console.log(token);

  try {
    res.render("user/resetPassword", { token, message: "" });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewShop = async (req, res) => {
  try {
    const categories = await Categories.find({}).select("name");
    const products = await Products.find();
    res.render("user/shop", { products, categories });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewProduct = async (req, res) => {
  const productId = req.query.id;
  try {
    const product = await Products.findOne({ _id: productId })
    res.render("user/product", { product });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewCart = async (req, res) => {
  const userId = req.session.user;

  try {
    if (!userId) {
      return res.redirect("/signin"); // or show a friendly message
    }

    const user = await Users.findById(userId).populate("cart.productId");

    if (!user) {
      return res.status(404).render("error", { error: "User not found" });
    }

    const carts = user.cart || [];

    res.render("user/cart", { carts });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewCheckout = async (req, res) => {
  const { cartData } = req.body;
  let parsed;
  const userId = req.session.user;

  try {
    parsed = JSON.parse(cartData);
    console.log("Cart Items:", parsed.items);
    console.log("Total:", parsed.total);

    const user = await Users.findById(userId).populate("cart.productId").populate("wishlist.productId").populate("orders.orderId");
    if (!user) {
      return res.status(404).render("error", { error: "User not found" });
    }

    // Save to DB, session, or pass to payment gateway
    res.render("user/checkout", { cart: parsed.items, total: parsed.total, user });
  } catch (e) {
    console.error("Invalid cart data:", e);
    res.status(400).send("Invalid cart data");
  }
};

const viewWishlist = async (req, res) => {
  const userId = req.session.user;

  try {
    if (!userId) {
      return res.redirect("/signin"); // or show a friendly message
    }

    const user = await Users.findById(userId).populate("wishlist.productId");

    if (!user) {
      return res.status(404).render("error", { error: "User not found" });
    }

    const wishlists = user.wishlist || [];

    res.render("user/wishList", { wishlists });

  } catch (error) {
    console.error("Error in viewWishlist:", error);
    res.status(500).render("error", { error: "Something went wrong" });
  }
};

const viewAccount = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.redirect("/signin"); // or show a friendly message
    }
    const user = await Users.findById(userId).populate("orders.orderId").populate("wishlist.productId").populate("cart.productId");
    res.render("user/account", { user });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewContact = async (req, res) => {
  try {
    res.render("user/contact", { });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewOrderTracking = async (req, res) => {
  try {
    res.render("user/orderTracking", { });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewProductReturn = async (req, res) => {
  try {
    res.render("user/productReturn", { });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewPayment = async (req, res) => {
  try {
    res.render("user/phonepay", { });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewAddress = async (req, res) => {
  try {
    res.render("user/address", { });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};
const viewPrivacyPolicy = async (req, res) => {
  try {
    res.render("user/privacypolicy", { });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};
const viewTermsofService = async (req, res) => {
  try {
    res.render("user/termsofService", { });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};
 
const getApiCountries = async (req, res) => {
  const countryList = Object.values(countries).map(c => c.name).sort();
  // Remove "India" if present and sort the rest
  const india = "India";
  const otherCountries = countryList.filter(name => name !== india).sort();

  // Put India at the top
  const finalList = [india, ...otherCountries];

  res.json(finalList);
};

const addToWishlist = async (req, res) => {
  const productId = req.query.id;
  const userId = req.session.user; // Assuming this contains the user's MongoDB _id
  console.log(productId, userId);

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }

    const user = await Users.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if product already exists in wishlist
    const alreadyInWishlist = user.wishlist.some(
      (item) => item.productId.toString() === productId
    );

    if (alreadyInWishlist) {
      return res.status(409).json({ success: false, message: "Product already in wishlist" });
    }

    // Add product to wishlist
    user.wishlist.push({ productId });
    await user.save();

    res.status(200).json({ success: true, message: "Product added to wishlist" });

  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).render("error", { error });
  }
};

const addToCart = async (req, res) => {
  const productId = req.query.id;
  const userId = req.session.user;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }

    const user = await Users.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const alreadyInCart = user.cart.some(
      (item) => item.productId.toString() === productId
    );

    if (alreadyInCart) {
      return res.status(409).json({ success: false, message: "Product already in cart" });
    }

    user.cart.push({ productId });
    await user.save();

    return res.status(200).json({ success: true, message: "Product added to cart" });

  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const removeFromCart = async (req, res) => {
  const userId = req.session.user;
  const productId = req.query.id;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    await Users.findByIdAndUpdate(userId, {
      $pull: { cart: { productId } }
    });

    res.status(200).json({ success: true, message: "Product removed from cart" });

  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const removeFromWishlist = async (req, res) => {
  const userId = req.session.user;
  const productId = req.query.id;

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    await Users.findByIdAndUpdate(userId, {
      $pull: { wishlist: { productId } }
    });

    res.status(200).json({ success: true, message: "Product removed from wishlist" });

  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  viewHomepage,
  viewSignin,
  viewSignup,
  signIn,
  signOut,
  signUp,
  viewForgotPassword,
  viewResetPassword,
  viewShop,
  viewProduct,
  viewCart,
  viewCheckout,
  viewWishlist,
  viewAccount,
  viewContact,
  viewOrderTracking,
  viewProductReturn,
  viewPayment,
  viewAddress,
  viewPrivacyPolicy,
  viewTermsofService,
  getApiCountries,
  addToCart,
  addToWishlist,
  removeFromCart,
  removeFromWishlist,

}