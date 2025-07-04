const express = require("express");
const adminRouter = express();
const adminController = require("../controllers/adminController");
const { isLogin, isLogout } = require("../middleware/adminAuth");
const upload = require("../multer/multer");

adminRouter.get("/login", isLogout, adminController.viewLogin); 
adminRouter.get("/logout", isLogin, adminController.logoutAdmin);
adminRouter.get("", adminController.viewDashboard);



adminRouter.post('/login', adminController.loginAdmin);

module.exports = adminRouter;