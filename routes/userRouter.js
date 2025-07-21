const express = require("express");
const userRouter = express();
const userController = require("../controllers/userController");
const {isLogin,isLogout} = require("../middleware/userAuth");
const upload = require("../multer/multer");
const Users = require("../models/userModel");
const UserHome = require("../models/userHomeModel");
const Categories=require("../models/categoryModel");


userRouter.use(async(req, res, next) => {
      if (req.session.user) {
          try {
            res.locals.user = await Users.findById(req.session.user)
            .populate("orders.orderId")
            .populate("wishlist.productId")
            .populate("cart.productId");
          } catch (error) {
              console.error('Error fetching user details:', error);
              res.locals.user = null;
          }
      } else {
          res.locals.user = null;
      }
      next();
  });

userRouter.use(async (req, res, next) => {
  try {
    const userHomeData = await UserHome.findOne(); // Get the first (and only) document
    res.locals.offerTag = userHomeData?.offerTag || null;
  } catch (error) {
    console.error('Error fetching offer tag:', error);
    res.locals.offerTag = null;
  }

  next();
});

userRouter.use(async (req, res, next) => {
  try {
    const categories = await Categories.find().select("name"); // Get the first (and only) document
    res.locals.categories = categories || null;
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.locals.categories = null;
  }

  next();
});

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
userRouter.get("/terms-of-service",userController.viewTermsofService);
userRouter.get("/refund-policy", userController.viewRefundPolicy);
userRouter.get("/return-policy", userController.viewReturnPolicy);
userRouter.get("/shipping-policy", userController.viewShippingPolicy);
userRouter.get("/api/countries", userController.getApiCountries);

userRouter.post("/signin", isLogout, userController.signIn);
userRouter.post("/signup", isLogout, userController.signUp);
userRouter.post("/cart/add",  userController.addToCart);
userRouter.post("/wishlist/add", userController.addToWishlist)
userRouter.post("/return", isLogin, upload.single('image'),userController.returnRequest);
userRouter.post("/checkout", isLogin, userController.viewCheckout);


userRouter.delete("/cart/remove", isLogin, userController.removeFromCart);
userRouter.delete("/wishlist/remove", isLogin, userController.removeFromWishlist);

module.exports = userRouter;