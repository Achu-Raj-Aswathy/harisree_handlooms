const express = require("express");
const adminRouter = express();
const adminController = require("../controllers/adminController");
const { isLogin, isLogout } = require("../middleware/adminAuth");
const upload = require("../multer/multer");

adminRouter.get("/", adminController.viewDashboard);
adminRouter.get("/login", isLogout, adminController.viewLogin); 
adminRouter.get("/logout", isLogin, adminController.logoutAdmin);
adminRouter.get("/add-category",  adminController.viewAddCategory);
adminRouter.get("/list-category",  adminController.viewListCategory);
adminRouter.get("/edit-category/:id",  adminController.viewEditCategory);
adminRouter.get("/add-product", adminController.viewAddProduct);
adminRouter.get("/list-product",  adminController.viewListProduct);
adminRouter.get("/edit-product/:id",  adminController.viewEditProduct);
adminRouter.get("/product", adminController.viewProductDetails);
adminRouter.get("/add-coupon",  adminController.viewAddCoupon);
adminRouter.get("/list-coupon", adminController.viewListCoupon);
adminRouter.get("/list-order",  adminController.viewListOrder);
adminRouter.get("/order-details", adminController.viewOrderDetails);
adminRouter.get("/list-user",  adminController.viewListUser);
adminRouter.get("/user-details", adminController.viewUserDetails);
adminRouter.get("/inventory",  adminController.viewInventory);
adminRouter.get("/sales-report", adminController.viewSalesReport);
adminRouter.get("/home-editor", adminController.viewHomeEditor);
adminRouter.get("/add-offers", adminController.viewAddOffers);
adminRouter.get("/list-offers", adminController.viewListOffers);
adminRouter.get("/order-tracking",adminController.viewOrderTracking);
adminRouter.get("/view-return", adminController.viewReturn);


adminRouter.post('/login', adminController.loginAdmin);
adminRouter.post('/add-category', upload.array("thumbnail[]", 5), adminController.addCategory);
adminRouter.post('/add-product', upload.array("thumbnail[]", 5), adminController.addProduct)


module.exports = adminRouter;