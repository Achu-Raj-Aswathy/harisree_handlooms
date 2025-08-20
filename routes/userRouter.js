const express = require("express");
const userRouter = express();
const userController = require("../controllers/userController");
const { isLogin, isLogout } = require("../middleware/userAuth");
const upload = require("../multer/multer");
const Users = require("../models/userModel");
const UserHome = require("../models/userHomeModel");
const Categories = require("../models/categoryModel");
const passport = require('passport');
require('../config/passport');
const moment = require("moment"); // Ensure moment is imported
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

userRouter.use(async (req, res, next) => {
  if (req.session.user) {
    try {
      res.locals.user = await Users.findById(req.session.user)
        .populate("orders.orderId")
        .populate("wishlist.productId")
        .populate("cart.productId");
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.locals.user = null;
    }
  } else {
    res.locals.user = null;
  }
  next();
});

userRouter.use(passport.initialize());
userRouter.use(passport.session());

userRouter.use(async (req, res, next) => {
  try {
    const userHomeData = await UserHome.findOne(); // Get the first (and only) document
    res.locals.offerTag = userHomeData?.offerTag || null;
  } catch (error) {
    console.error("Error fetching offer tag:", error);
    res.locals.offerTag = null;
  }

  next();
});

userRouter.use(async (req, res, next) => {
  try {
    const categories = await Categories.find().select("name"); // Get the first (and only) document
    res.locals.categories = categories || null;
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.locals.categories = null;
  }

  next();
});

userRouter.use((req, res, next) => {
  const currentUrl = req.originalUrl;

  res.locals.pathname = req.path;

  const isStaticAsset = currentUrl.startsWith('/assets');

  if (
    !req.session.user &&
    req.method === "GET" &&
    !["/signin", "/signup"].includes(currentUrl) &&
    !isStaticAsset
  ) {
    req.session.originalUrl = currentUrl;
  }

  next();
});

userRouter.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

userRouter.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.redirect("/signin");
      }

      req.session.user = req.user._id;

      console.log("✅ Google OAuth Success:", req.user);
      
      const loginTime = moment().format("DD/MM/YY, hh:mm A");

      // Send login alert email
      await transporter.sendMail({
        from: process.env.EMAIL,
        to: req.user.email,
        subject: `🔐 Login Alert - Harisree Handlooms at ${loginTime}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px;">
            <h2 style="background: #5e9c76; color: white; padding: 15px; margin: 0;">Login Alert</h2>
            <p>Hi <strong>${req.user.name}</strong>,</p>
            <p>We noticed a new login to your account at Harisree Handlooms on <strong>${loginTime}</strong>.</p>
            <p>If this was you, you can safely ignore this email. Otherwise, please reset your password immediately.</p>
            <p style="margin-top: 30px;">Warm regards,<br/><strong>Team Harisree</strong></p>
            <footer style="text-align: center; color: #888; font-size: 12px; margin-top: 30px;">
              Harisree Handlooms — Crafted with Love in Kerala
            </footer>
          </div>
        `,
      });

      res.redirect('/');
    } catch (err) {
      console.error("Google login error:", err);
      res.redirect('/signin');
    }
  }
);

userRouter.get("/", userController.viewHomepage);
userRouter.get("/signin", isLogout, userController.viewSignin);
userRouter.get("/signup", isLogout, userController.viewSignup);
userRouter.get("/signout", isLogin, userController.signOut);
userRouter.get("/forgot-password", isLogout, userController.viewForgotPassword);
userRouter.get("/reset-password", isLogout, userController.viewResetPassword);
userRouter.get("/shop", userController.viewShop);
userRouter.get("/product", userController.viewProduct);
userRouter.get("/cart", isLogin, userController.viewCart);
userRouter.get("/wishlist", isLogin, userController.viewWishlist);
userRouter.get("/account", isLogin, userController.viewAccount);
userRouter.get("/contact", userController.viewContact);
userRouter.get("/order-tracking", isLogin, userController.viewOrderTracking);
userRouter.get("/product-return", isLogin, userController.viewProductReturn);
userRouter.get("/payment", isLogin, userController.viewPayment);
userRouter.get("/privacy-policy", userController.viewPrivacyPolicy);
userRouter.get("/terms-of-service", userController.viewTermsofService);
userRouter.get("/refund-policy", userController.viewRefundPolicy);
userRouter.get("/return-policy", userController.viewReturnPolicy);
userRouter.get("/shipping-policy", userController.viewShippingPolicy);
userRouter.get("/api/countries", userController.getApiCountries);
userRouter.get("/api/states/:countryName", userController.getApiStates);
userRouter.get("/api/search", userController.getApiSearch);
userRouter.get("/order", userController.viewOrderDetails);

userRouter.post("/signin", isLogout, userController.signIn);
userRouter.post("/signup", isLogout, userController.signUp);
userRouter.post("/cart/add", userController.addToCart);
userRouter.post("/wishlist/add", userController.addToWishlist);
userRouter.post(
  "/return",
  isLogin,
  upload.single("image"),
  userController.returnRequest
);
userRouter.post("/checkout", isLogin, userController.viewCheckout);
userRouter.post(
  "/product/:id/review",
  isLogin,
  upload.array("images"),
  userController.addReview
);
userRouter.post("/forgot-password", isLogout, userController.forgotPassword);
userRouter.post("/account-edit", isLogin, userController.updateAccountDetails);
userRouter.post("/reset-password", isLogout, userController.resetPassword);

userRouter.delete("/cart/remove", isLogin, userController.removeFromCart);
userRouter.delete("/wishlist/remove", isLogin, userController.removeFromWishlist);
userRouter.delete("/product/:productId/review/:reviewId/delete", isLogin, upload.array("images"), userController.deleteReview);


userRouter.put("/product/:productId/review/:reviewId", isLogin, upload.array("images"), userController.editReview);

// Payment Routes
userRouter.post("/create-phonepe-order", userController.createPhonePeOrder);
userRouter.get("/status", userController.status);
userRouter.post("/create-cod-order", userController.createCodOrder);

// dtdc
// userRouter.get("/dtdc/shipping-label", isLogin, userController.downloadDTDCLabel);
userRouter.get("/dtdc/track", isLogin, userController.trackDTDCShipment);
userRouter.post("/dtdc/cancel-shipment", isLogin, userController.cancelDTDCShipment);

module.exports = userRouter;
