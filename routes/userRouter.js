const express = require("express");
const userRouter = express();
const userController = require("../controllers/userController");
const {isLogin,isLogout} = require("../middleware/userAuth");
const upload = require("../multer/multer");

userRouter.get("/", userController.viewHomepage);
userRouter.get("/signin", isLogout, userController.viewSignin);
userRouter.get("/signup", isLogout, userController.viewSignup);
userRouter.get("/signout", userController.signOut);

userRouter.post("/signin", userController.signIn);
userRouter.post("/signup", userController.signUp);

module.exports = userRouter;