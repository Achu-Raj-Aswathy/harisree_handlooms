const express = require("express");
const userRouter = express();
const userController = require("../controllers/userController");
const {isLogin,isLogout} = require("../middleware/userAuth");
const upload = require("../multer/multer");

userRouter.get("/", userController.viewHomepage);
userRouter.get("/signin", isLogout, userController.viewSignin);
userRouter.get("/signup", isLogout, userController.viewSignup);
userRouter.get("/signout", userController.signOut);
userRouter.get("/forgot-password", isLogout, userController.viewForgotPassword);
userRouter.get("/reset-password", isLogout, userController.viewResetPassword);
userRouter.get("/shop", userController.viewShop);
userRouter.get("/product", userController.viewProduct);
userRouter.get("/cart", userController.viewCart);
userRouter.get("/checkout", userController.viewCheckout);
userRouter.get("/wishlist", userController.viewWishlist);
userRouter.get("/account", userController.viewAccount);
userRouter.get("/contact", userController.viewContact);
userRouter.get("/order-tracking", userController.viewOrderTracking);
userRouter.get("/product-return", userController.viewProductReturn);
userRouter.get("/payment", userController.viewPayment);
userRouter.get("/address",userController.viewAddress);




userRouter.post("/signin", userController.signIn);
userRouter.post("/signup", userController.signUp);

module.exports = userRouter;