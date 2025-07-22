const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Users = require("../models/userModel");
const { countries } = require('countries-list');
const UserHome = require("../models/userHomeModel");
const Products = require("../models/productModel");
const Offers = require("../models/offerModel")
const Categories = require("../models/categoryModel");
const Requests = require('../models/returnRequestModel');
const Reviews = require('../models/reviewModel');
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const { StandardCheckoutClient, Env, StandardCheckoutPayRequest } = require('pg-sdk-node');

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

// ===================
// PhonePe Config
// ===================
// const CLIENT_ID = "SU2504031724337089600354";
// const CLIENT_SECRET = "299536df-733d-430e-84dc-0d932b331af9";

const CLIENT_ID = "TEST-M2336HV644IDN_25062";
const CLIENT_SECRET = "MTI5YTU1YWQtNTIxZS00ZTYzLWE0ZDQtNTFiYjRhZTdmOWUw";
const SALT_INDEX = "1";
// const ENV = Env.PRODUCTION; // Change to "UAT" for testing
const ENV = Env.UAT;

const client = StandardCheckoutClient.getInstance(CLIENT_ID, CLIENT_SECRET, SALT_INDEX, ENV);

const redirectUrl = "https://hariseehandlooms.com/status";
const successUrl = "https://hariseehandlooms.com/success";
const failureUrl = "https://hariseehandlooms.com/failure";

const tempBookingStore = {}; // Temporary store for booking data

// ==========================
// ▶️ Create PhonePe Order
// ==========================
const createPhonePeOrder = async (req, res) => {
  try {
    const { cartData } = req.body;
    const userId = req.session.user;

    if (!cartData || !userId) {
      return res.status(400).json({ error: "Missing cart data or user session" });
    }

    const parsed = JSON.parse(cartData);
    const { items, total } = parsed;

    const user = await Users.findById(userId);
    if (!user || !items.length || !total) {
      return res.status(400).json({ error: "Invalid user/cart" });
    }

    const orderId = uuidv4();

    // Basic check
    if (!amount || !name || !phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    // Save to temp store using orderId
        tempBookingStore[orderId] = {
      user: {
        name: user.name,
        email: user.email,
        phone: user.mobile,
      },
      items,
      total,
      paid: 1,
    };

    const redirectWithOrder = `${redirectUrl}?id=${orderId}`;

    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(orderId)
      .amount(amount * 100)
      .redirectUrl(redirectWithOrder)
      .build();

    const response = await client.pay(request);

    return res.json({ checkoutPageUrl: response.redirectUrl });
  } catch (error) {
    console.error("❌ Error in payment:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to initiate payment" });
  }
};

// ==========================
// ✅ Check Payment Status
// ==========================
const status = async (req, res) => {
  try {
    const merchantOrderId = req.query.id;
    // if (!merchantOrderId) return res.redirect(failureUrl);
    if (!merchantOrderId) {
      console.error("❌ No merchantOrderId provided in query params");

    const response = await client.getOrderStatus(merchantOrderId);
    console.log("📦 Full status response:", response);

    const status = response.state;

    if (status === "COMPLETED") {
      const orderData = tempBookingStore[merchantOrderId];

      if (!orderData) {
        console.error("❌ Order data not found in temp store");
        return res.redirect(failureUrl);
      }

       const newOrder = new Orders({
        userId: req.session.user,
        items: orderData.items,
        total: orderData.total,
        status: "Paid",
        paymentMethod: "PhonePe",
        createdAt: new Date(),
      });

      await newOrder.save();

      // Send mail to user
     await transporter.sendMail({
        from: process.env.EMAIL,
        to: orderData.user.email,
        subject: "🧺 Order Confirmed",
        html: `
          <p>Hi <strong>${orderData.user.name}</strong>,</p>
          <p>Thank you for your order! Total: ₹${orderData.total}</p>
          <p>We'll start processing your order shortly.</p>
        `
      });

            delete tempBookingStore[merchantOrderId];

      return res.redirect(`${successUrl}?order=${merchantOrderId}`);
      
    } else {
      return res.redirect(failureUrl);
    }
  }} catch (error) {
    console.error("Error in status check:", error.response?.data || error.message);
    return res.redirect(failureUrl);
  }
};

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
     const selectedCategory = req.query.category;
    let filter = {};

    if (selectedCategory) {
      const categoryDoc = await Categories.findOne({ name: selectedCategory });
      if (categoryDoc) {
        filter.categoryId = categoryDoc._id;
      }
    }

    const products = await Products.find(filter).populate("categoryId", "name");
    let userWishlistProductIds = [];

    if (req.session.user) {
      const user = await Users.findById(req.session.user);
      userWishlistProductIds = user?.wishlist?.map(item => item.productId.toString()) || [];
    }
    res.render("user/shop", { products, categories, userWishlistProductIds, selectedCategory: selectedCategory || null });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewProduct = async (req, res) => {
  const productId = req.query.id;
  try {
    const product = await Products.findOne({ _id: productId })
   const reviews = await Reviews.find({ productId });


    // Calculate average rating
    let avgRating = 0;
    if (reviews.length > 0) {
      const total = reviews.reduce((sum, review) => sum + review.rating, 0);
      avgRating = (total / reviews.length).toFixed(1);
    }
 if (!product) return res.status(404).send('Product not found');

    // Save recently viewed products in session
    if (!req.session.recentlyViewed) req.session.recentlyViewed = [];

    // Remove if already exists
    req.session.recentlyViewed = req.session.recentlyViewed.filter(
      (id) => id !== productId
    );

    // Add to beginning
    req.session.recentlyViewed.unshift(productId);

    // Limit to last 10 items
    req.session.recentlyViewed = req.session.recentlyViewed.slice(0, 10);


    const recentlyViewedIds = req.session.recentlyViewed.filter(id => id !== productId);
const recentlyViewedProducts = await Products.find({ _id: { $in: recentlyViewedIds } }); 

    res.render("user/product", {
      product,
      reviews,
      avgRating,
      recentlyViewedProducts,
    });
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
      return res.render("user/signin"); // or show a friendly message
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
 
const viewRefundPolicy = async (req, res) => {
  try {
    res.render("user/refund-policy", { });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewReturnPolicy = async (req, res) => {
  try {
    res.render("user/return-policy", { });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewShippingPolicy = async (req, res) => {
  try {
    res.render("user/shipping-policy", { });
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


const returnRequest = async (req, res) => {
  try {
    const { orderId, productName, receivedDate, reason, description } = req.body;
    const userId = req.session.user // Adjust this line based on your session structure

    if (!userId) {
      return res.redirect('/signin');
    }
    const imagePath = req.file ? `/uploads/${req.file.filename}` : "no-image";

    const newRequest = new Requests({
      orderId,
      productName,
      dateOfProduct: receivedDate,
      reason,
      userId,
      image: imagePath,
      description: description || "",
    });

    await newRequest.save();

    return res.status(200).json({
  success: true,
  redirect: '/account' // 👈 include this key
});

  } catch (error) {
    console.error("Return request submission failed:", error);
     return res.status(400).json({success:false});
  }
};



const getApiSearch= async (req, res) => {
  const query = req.query.query.toLowerCase();
  const products = await Products.find(); // Replace with real DB query

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(query)
  );

  res.json(filtered);
};

const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const productId = req.params.id;
    const userId = req.session.user; // Or wherever you're storing logged-in user

    const newReview = new Reviews({
      userId,
      productId,
      rating,
      review: comment
    });

    await newReview.save();
    res.redirect(`/product?id=${productId}`);
  } catch (err) {
    console.error("Review Save Error:", err);
    res.status(500).send("Review submission failed.");
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const { email } = req.body;
    const user = await Users.findOne({ email });
    if (!user) {
      return res.render("user/forgotPassword", {
        message: "User not found",
        messageType: "danger",
      });
    }
    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
      expiresIn: "10m",
    });
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 600000; // 10 minutes
    await user.save();

    const resetLink = `${process.env.BASE_URL}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"Support Team" <${process.env.EMAIL}>`,
      to: email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello <strong>${user.email}</strong>,</p>
          <p>We received a request to reset your password. Click the button below to set a new password:</p>
          <p style="text-align: center;">
            <a href="${resetLink}" 
               style="background-color: #007bff; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Reset Your Password
            </a>
          </p>
          <p>If you did not request a password reset, please ignore this email. This link will expire in <strong>10 minutes</strong>.</p>
          <p>For security reasons, do not share this email or the reset link with anyone.</p>
          <p>Best Regards,</p>
          <p><strong>Harisree Handlooms</strong></p>
        </div>
      `,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err)
        return res.render("user/forgotPassword", {
          message: "Error sending email",
          messageType: "danger",
        });
      return res.render("user/forgotPassword", {
        message: "Reset email sent!",
        messageType: "success",
      });
    });
    // Send email with token
  }catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const resetPassword = async (req, res) => {
  const token = req.query.token;
  const { password, confirmPassword } = req.body;
  console.log(token);

  if (password != confirmPassword) {
    return res.status(400).render("user/resetPassword", {
      message: "Passwords do not match",
      messageType: "danger",
      token,
    });
  }

  try {
    const user = await Users.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).render("user/resetPassword", {
        message: "Invalid or expired token",
        messageType: "danger",
        token,
      });
    }

    user.password = password;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.render("user/signin", {
      message: "Password reset successful. Login here",
      messageType: "success",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
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
  viewPrivacyPolicy,
  viewTermsofService,
  viewRefundPolicy,
  viewReturnPolicy,
  viewShippingPolicy,
  getApiCountries,
  addToCart,
  addToWishlist,
  removeFromCart,
  removeFromWishlist,
  returnRequest,
  createPhonePeOrder,
  status,
  getApiSearch,
  addReview,
  forgotPassword,
  resetPassword,
  // viewSuccess,
  // viewFailure,
}