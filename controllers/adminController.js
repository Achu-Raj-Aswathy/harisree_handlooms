const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const Users = require("../models/userModel");
const Categories = require("../models/categoryModel");

const viewLogin = async (req, res) => {
  try {
    res.render("admin/login", { message: "" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const logoutAdmin = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/admin/login");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email, password);
    const admin = await Users.findOne({ email, role: "admin" });
    if (!admin) {
      return res.render("admin/login", {
        message: "Invalid email or not an admin",
        messageType: "danger",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.render("admin/login", {
        message: "Invalid password",
        messageType: "danger",
      });
    }

    const token = jwt.sign({ id: admin._id }, process.env.SECRET_KEY, {
      expiresIn: "7d",
    });

    req.session.token = token;
    req.session.admin = admin._id;

    res.redirect("/admin/");
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const viewDashboard = async (req, res) => {
  try {
    res.render("admin/dashboard", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewAddCategory = async (req, res) => {
  try {
    const lastCategory = await Categories.findOne({})
      .sort({ createdAt: -1 })
      .select("categoryId");
    console.log("last", lastCategory);

    let nextCategoryId;

    if (lastCategory && lastCategory.categoryId) {
      // Extract numeric part (e.g., from 'INV00123')
      const lastSeq = parseInt(
        lastCategory.categoryId.replace("CatID-", ""),
        10
      );
      const newSeq = lastSeq + 1;
      nextCategoryId = `CatID-${String(newSeq).padStart(5, "0")}`;
    } else {
      // Default to INV00001 if no flights exist
      nextCategoryId = "CatID-00001";
    }
console.log("last", nextCategoryId);
    res.render("admin/addCategory", { categoryId: nextCategoryId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewListCategory = async (req, res) => {
  try {
    res.render("admin/listCategory", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewEditCategory = async (req, res) => {
  try {
    res.render("admin/editCategory", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewAddProduct = async (req, res) => {
  try {
    res.render("admin/addProduct", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewListProduct = async (req, res) => {
  try {
    res.render("admin/productList", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewEditProduct = async (req, res) => {
  try {
    res.render("admin/editProduct", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewProductDetails = async (req, res) => {
  try {
    res.render("admin/productDetails", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewAddCoupon = async (req, res) => {
  try {
    res.render("admin/couponsAdd", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewListCoupon = async (req, res) => {
  try {
    res.render("admin/couponsList", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewListOrder = async (req, res) => {
  try {
    res.render("admin/orderList", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewOrderDetails = async (req, res) => {
  try {
    res.render("admin/orderDetails", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewListUser = async (req, res) => {
  try {
    res.render("admin/userList", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewUserDetails = async (req, res) => {
  try {
    res.render("admin/customerDetails", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewInventory = async (req, res) => {
  try {
    res.render("admin/inventory", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewSalesReport = async (req, res) => {
  try {
    res.render("admin/reportAndAnalysis", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewAddOffers = async (req, res) => {
  try {
    res.render("admin/addOffers", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewListOffers = async (req, res) => {
  try {
    res.render("admin/listOffers", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewHomeEditor = async (req, res) => {
  try {
    res.render("admin/homeEditor", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewOrderTracking = async (req, res) => {
  try {
    res.render("admin/orderTrackingAdmin", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewReturn = async (req, res) => {
  try {
    res.render("admin/returnView", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const addCategory = async (req, res) => {
  try {
    const { categoryId, categoryName, description } = req.body;

    // Collect uploaded file paths
    const thumbnails = req.files.map(file => `/uploads/${file.filename}`);

    // Save to DB
    const newCategory = new Categories({
      categoryId,
      name: categoryName,
      description,
      images: thumbnails, // Store image paths array
    });

    await newCategory.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving category:", error);
    res.json({ success: false, message: error.message });
  }
}

module.exports = {
  viewLogin,
  logoutAdmin,
  loginAdmin,
  viewDashboard,
  viewAddCategory,
  viewListCategory,
  viewEditCategory,
  viewAddProduct,
  viewListProduct,
  viewEditProduct,
  viewProductDetails,
  viewAddCoupon,
  viewListCoupon,
  viewListOrder,
  viewOrderDetails,
  viewListUser,
  viewUserDetails,
  viewInventory,
  viewSalesReport,
  viewAddOffers,
  viewListOffers,
  viewHomeEditor,
  viewOrderTracking,
  viewReturn,

  addCategory,

};
