const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const Users = require("../models/userModel");
const Categories = require("../models/categoryModel");
const Products = require("../models/productModel");
const UserHome = require("../models/userHomeModel");
const Coupons = require("../models/couponModel");
const Orders = require("../models/orderModel");
const Offers = require("../models/offerModel");
const Requests = require("../models/returnRequestModel");
const Reviews = require("../models/reviewModel");
const PDFDocument = require("pdfkit");
const axios = require("axios");
const sharp = require("sharp");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

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
    const orders = await Orders.find()
      .populate("userId")
      .populate("items.productId")
      .sort({ createdAt: -1 })
      .limit(10);
    const products = await Products.find();
    const customers = await Users.find();

    const totalOrders = orders.length;
    const totalProducts = products.length;
    const totalCustomers = customers.length;

    res.render("admin/dashboard", {
      orders,
      totalOrders,
      totalProducts,
      totalCustomers,
    });
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
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // or whatever limit you prefer

    const total = await Categories.countDocuments();
    const categories = await Categories.find()
      .skip((page - 1) * limit)
      .limit(limit);

    const totalPages = Math.ceil(total / limit);

    res.render("admin/listCategory", {
      categories,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const viewEditCategory = async (req, res) => {
  const categoryId = req.query.id;

  try {
    const category = await Categories.findById(categoryId);
    if (!category) {
      return res.status(404).send("Category not found");
    }
    console.log(category);
    res.render("admin/editCategory", { category });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewAddProduct = async (req, res) => {
  try {
    const lastProduct = await Products.findOne({})
      .sort({ createdAt: -1 })
      .select("productId");
    console.log("last", lastProduct);

    let nextProductId;

    if (lastProduct && lastProduct.productId) {
      // Extract numeric part (e.g., from 'INV00123')
      const lastSeq = parseInt(lastProduct.productId.replace("PID-", ""), 10);
      const newSeq = lastSeq + 1;
      nextProductId = `PID-${String(newSeq).padStart(5, "0")}`;
    } else {
      // Default to INV00001 if no flights exist
      nextProductId = "PID-00001";
    }
    console.log("last", nextProductId);

    const categories = await Categories.find({}).select("name"); // only fetch name and _id

    res.render("admin/addProduct", {
      productId: nextProductId,
      categories,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewListProduct = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const [products, totalProducts] = await Promise.all([
      Products.find().populate("categoryId").skip(skip).limit(limit),
      Products.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalProducts / limit);

    res.render("admin/productList", {
      products,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewEditProduct = async (req, res) => {
  const productId = req.query.id;
  try {
    const product = await Products.findById(productId).populate("categoryId");
    if (!product) {
      return res.status(404).send("Product not found");
    }
    const categories = await Categories.find({}).select("name"); // only fetch name and _id
    res.render("admin/editProduct", { product, categories });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewProductDetails = async (req, res) => {
  const productId = req.query.id;
  try {
    const product = await Products.findById(productId);
    if (!product) {
      return res.status(404).send("Product not found");
    }
    res.render("admin/productDetails", { product });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewAddCoupon = async (req, res) => {
  try {
    const categories = await Categories.find({}).select("name");
    res.render("admin/couponsAdd", { categories });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewListCoupon = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const total = await Coupons.countDocuments();
    const totalPages = Math.ceil(total / limit);

    const coupons = await Coupons.find()
      .populate("productId")
      .populate("categoryId")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.render("admin/couponsList", {
      coupons,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewListOrder = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page number
    const limit = 10; // Orders per page

    const total = await Orders.countDocuments(); // Total number of orders
    const totalPages = Math.ceil(total / limit); // Calculate total pages

    const orders = await Orders.find()
      .populate("userId")
      .populate("items.productId")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 }); // Optional: latest first

    res.render("admin/orderList", {
      orders,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const viewOrderDetails = async (req, res) => {
  const orderId = req.query.id;
  try {
    const order = await Orders.findById(orderId).populate("userId").populate("items.productId");
    res.render("admin/orderDetails", {order});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewListUser = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page from query
    const limit = 10; // Users per page

    const total = await Users.countDocuments({ role: "user" });
    const totalPages = Math.ceil(total / limit);

    const users = await Users.find({ role: "user" })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.render("admin/userList", {
      users,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewUserDetails = async (req, res) => {
  const userId = req.query.id;

  try {
    const user = await Users.findById(userId);

    if (!user) {
      return res.status(404).send("User not found");
    }

    // Find all orders placed by this user
    const orders = await Orders.find({ userId: user._id });

    // Calculate total price
    const totalOrderPrice = orders.reduce((sum, order) => sum + order.total, 0);

    res.render("admin/customerDetails", {
      user,
      totalOrderPrice,
      orders, // optional: if you want to show individual order details
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewInventory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page number
    const limit = 10; // Items per page

    const total = await Products.countDocuments(); // Total number of products
    const totalPages = Math.ceil(total / limit); // Total number of pages

    const products = await Products.find()
      .populate("categoryId")
      .skip((page - 1) * limit)
      .limit(limit);

    res.render("admin/inventory", {
      products,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const viewSalesReport = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const total = await Products.countDocuments();
    const totalPages = Math.ceil(total / limit);

    const products = await Products.find()
      .populate("categoryId")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.render("admin/reportAndAnalysis", {
      products,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewAddOffers = async (req, res) => {
  try {
    const categories = await Categories.find({}).select("name");
    res.render("admin/addOffers", { categories });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewListOffers = async (req, res) => {
  try {
    const offers = await Offers.find().lean();
    res.render("admin/listOffers", { offers });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewHomeEditor = async (req, res) => {
  try {
    const homeEditArr = await UserHome.find().sort({ _id: -1 }).limit(1);
    const homeEdits = homeEditArr[0] || null;

    if (homeEdits && homeEdits.sliderImages) {
      console.log("Slider 1 image:", homeEdits.sliderImages.slider1); // ✅ correct
    }

    res.render("admin/homeEditor", { homeEdits });
  } catch (error) {
    console.error("Error in viewHomeEditor:", error);
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
    // 1. Get all return requests
    const returnRequests = await Requests.find().populate("userId");

    // 2. Convert string orderIds to ObjectId
    const orderObjectIds = returnRequests.map(req => new mongoose.Types.ObjectId(req.orderId));

    // 3. Fetch matching orders by _id
    const orders = await Orders.find({ _id: { $in: orderObjectIds } });

    // 4. Create a map for quick lookup
    const orderMap = {};
    orders.forEach(order => {
      orderMap[order._id.toString()] = order;
    });

    // 5. Merge order details into requests
    const requestsWithOrders = returnRequests.map(req => ({
      ...req.toObject(),
      orderDetails: orderMap[req.orderId] || null
    }));

    // 6. Render
    res.render("admin/returnView", { returnRequests: requestsWithOrders });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const addCategory = async (req, res) => {
  try {
    const { categoryId, categoryName, description } = req.body;

   const thumbnails = [];

    // Ensure /uploads directory exists
    const uploadDir = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Compress and save each uploaded image
    for (const file of req.files) {
      const inputPath = file.path; // multer stores temporarily
      const outputFileName = `${Date.now()}-${file.originalname}`;
      const outputPath = path.join(uploadDir, outputFileName);

      // Compress image using sharp
      await sharp(inputPath)
        .resize({ width: 1080 }) // Optional: resize to standard width
        .jpeg({ quality: 80 })   // Compress to ~80% quality
        .toFile(outputPath);

      // Delete the original temp file
      fs.unlinkSync(inputPath);

      thumbnails.push(`/uploads/${outputFileName}`);
    }

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
};

const viewEditCoupon = async (req, res) => {
  const couponId = req.query.id;
  try {
    const coupon = await Coupons.findById(couponId);
    const categories = await Categories.find({}).select("name"); // only fetch name and _id
    res.render("admin/editCoupon", { categories, coupon });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const addProduct = async (req, res) => {
  try {
    const {
      productId,
      productName,
      description,
      categoryId,
      price,
      stock,
      lowStockAlert,
      gender,
      hsnCode,
      skuId,
      specification,
      size,
      discount,
      fabric,
      design,
      colour,
    } = req.body;

    const thumbnails = [];

    // Ensure /uploads exists
    const uploadDir = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Compress and save images
    for (const file of req.files) {
      const inputPath = file.path; // multer will have saved it already
      const ext = path.extname(file.originalname);
      const outputFileName = `${Date.now()}-${file.originalname}`;
      const outputPath = path.join(uploadDir, outputFileName);

      // Compress using sharp
      await sharp(inputPath)
        .resize({ width: 1080 }) // Optional: Resize to max width 1080px
        .jpeg({ quality: 80 }) // Adjust quality for JPEG
        .toFile(outputPath);

      // Delete original uncompressed file
      fs.unlinkSync(inputPath);

      thumbnails.push(`/uploads/${outputFileName}`);
    }

    // Save to DB
    const newProduct = new Products({
      productId,
      categoryId,
      name: productName,
      description,
      price,
      discount,
      stock: stock,
      lowStockLimit: lowStockAlert,
      gender,
      hsnCode,
      blouseDetails: specification,
      skuId,
      length: size,
      colour,
      design,
      fabric,
      availableStock: stock,
      images: thumbnails,
    });

    await newProduct.save();

    res.json({ success: true });
  } catch (error) {
    console.error("Error saving product:", error);
    res.json({ success: false, message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Categories.findById(req.params.id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    // 1. Find products linked to this category
    const products = await Products.find({ categoryId: category._id });

    // 2. Loop through products and delete their images
    for (const product of products) {
      product.images.forEach((image) => {
        const filePath = path.join(__dirname, "../public/uploads", image);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });

      // 3. Delete the product from DB
      await Products.findByIdAndDelete(product._id);
    }

    // 4. Delete category images from filesystem
    category.images.forEach((image) => {
      const filePath = path.join(__dirname, "../public/uploads", image);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    // 5. Delete the category itself
    await Categories.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Category and related products deleted successfully",
    });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Products.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Optional: Delete images from filesystem if stored locally
    product.images.forEach((image) => {
      const filePath = path.join(__dirname, "../public/uploads", image);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    await Products.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const editCategory = async (req, res) => {
  try {
    const categoryId = req.query.id;
    const { name, description, existingImages } = req.body;

    const category = await Categories.findById(categoryId);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    // Parse retained old images
    let retainedImages = [];
    if (existingImages) {
      retainedImages = JSON.parse(existingImages); // array of old image filenames
    }

    // Upload new images

    const uploadDir = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

        // Compress and save new images (if any)
    const newImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const inputPath = file.path; // multer temp path
        const outputFileName = `${Date.now()}-${file.originalname}`;
        const outputPath = path.join(uploadDir, outputFileName);

        await sharp(inputPath)
          .resize({ width: 1080 }) // Optional: resize
          .jpeg({ quality: 80 })   // Compress JPEG to ~<500KB
          .toFile(outputPath);

        // Remove original uploaded image
        fs.unlinkSync(inputPath);

        newImages.push(`/uploads/${outputFileName}`);
      }
    }

    // Delete old images that were removed
    category.images.forEach((img) => {
      const imgFilename = path.basename(img); // get filename only
      if (!retainedImages.includes(imgFilename)) {
        const imgPath = path.join(__dirname, "../public", img); // img already includes /uploads
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      }
    });

    // Merge retained + new
    category.images = [
      ...retainedImages.map((name) => `/uploads/${name}`),
      ...newImages,
    ];
    category.name = name;
    category.description = description;

    await category.save();

    res.json({ success: true, message: "Category updated successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const viewProductsByCategory = async (req, res) => {
  try {
    const products = await Products.find({ categoryId: req.params.categoryId });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

const updateSlider = async (req, res) => {
  try {
    const homeData = await UserHome.findOne();
    if (!homeData) {
      return res
        .status(404)
        .json({ success: false, message: "Home content not found" });
    }

    const currentImages = homeData.sliderImages || {};
    const updatedImages = { ...currentImages };

    for (let i = 1; i <= 4; i++) {
      const field = `sliderImage${i}`;
      const key = `slider${i}`;

      // Check if a new file was uploaded
      if (req.files && req.files[field] && req.files[field][0]) {
        const newPath = "/uploads/" + req.files[field][0].filename;

        // Delete old image if it exists
        const oldPath = currentImages[key];
        if (oldPath) {
          const oldFilePath = path.join(__dirname, "../public", oldPath);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }

        // Update with new image path
        updatedImages[key] = newPath;
      }
    }

    // Save only the updated fields
    homeData.sliderImages = updatedImages;
    await homeData.save();

    return res.json({ success: true, message: "Slider updated successfully" });
  } catch (err) {
    console.error("Error updating slider:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const addCoupon = async (req, res) => {
  try {
    const {
      code,
      categoryId,
      productId,
      discountValue,
      startDate,
      endDate,
      status,
    } = req.body;
    const [startDay, startMonth, startYear] = startDate.split("-");
    const [endDay, endMonth, endYear] = endDate.split("-");

    const parsedStartDate = new Date(`${startYear}-${startMonth}-${startDay}`);
    const parsedEndDate = new Date(`${endYear}-${endMonth}-${endDay}`);
    const coupon = new Coupons({
      code,
      categoryId,
      productId,
      discountPercentage: discountValue,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      status,
    });

    await coupon.save();

    res.json({ success: true, message: "Coupon created successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

const updateOfferTagline = async (req, res) => {
  try {
    const { tagline } = req.body;

    if (!tagline || typeof tagline !== "string" || !tagline.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid tagline." });
    }

    const homeContent = await UserHome.findOne();
    if (!homeContent) {
      return res
        .status(404)
        .json({ success: false, message: "UserHome data not found." });
    }

    homeContent.offerTag = tagline.trim();
    await homeContent.save();

    res.json({ success: true, message: "Tagline updated successfully." });
  } catch (err) {
    console.error("Tagline update error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while updating tagline.",
    });
  }
};

const editCoupon = async (req, res) => {
  const couponId = req.query.id;
  console.log("Coupon ID from URL:", req.query.id);

  try {
    const {
      code,
      categoryId,
      productId,
      discountValue,
      startDate,
      endDate,
      status,
    } = req.body;
    console.log(req.body);
    const [startDay, startMonth, startYear] = startDate.split("-");
    const [endDay, endMonth, endYear] = endDate.split("-");

    const parsedStartDate = new Date(`${startYear}-${startMonth}-${startDay}`);
    const parsedEndDate = new Date(`${endYear}
      -${endMonth}-${endDay}`);

    await Coupons.findByIdAndUpdate(couponId, {
      code,
      categoryId,
      productId,
      discountPercentage: discountValue,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      status,
    });

    return res.json({ success: true }); // 👈 go back to the list page
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.status(500).send("Error updating coupon");
  }
};

const deleteCoupon = async (req, res) => {
  try {
    await Coupons.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting coupon:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete coupon" });
  }
};

const addOffer = async (req, res) => {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      discount,
      categoryId,
      productId,
    } = req.body;

    let compressedImageFilename = null;

    if (req.file) {
      const inputPath = req.file.path; // Original temp file (from multer)
      const outputDir = path.join(__dirname, "../public/uploads");

      // Ensure upload directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputFileName = `${Date.now()}-${req.file.originalname}`;
      const outputPath = path.join(outputDir, outputFileName);

      // Compress image using sharp
      await sharp(inputPath)
        .resize({ width: 1080 }) // Resize if needed
        .jpeg({ quality: 80 })   // Compress to approx < 500 KB
        .toFile(outputPath);

      // Delete original uncompressed image
      fs.unlinkSync(inputPath);

      compressedImageFilename = outputFileName;
    }

    const newOffer = new Offers({
      name: title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      discountPercentage: discount,
      image: compressedImageFilename,
      categoryId,
      productId,
    });

    await newOffer.save();

    res.redirect("/admin/list-offers"); // change to wherever your list view is
  } catch (error) {
    console.error("Error adding offer:", error);
    res.status(500).send("Failed to add offer");
  }
};

const viewEditOffer = async (req, res) => {
  console.log("hai");
  const offerId = req.query.id; // or use req.params.id if using route like /offer/edit/:id
  console.log(offerId);
  try {
    const offer = await Offers.findById(offerId);

    if (!offer) {
      return res
        .status(404)
        .json({ success: false, message: "Offer not found" });
    }

    const categories = await Categories.find({}).select("name");

    res.render("admin/editOffer", { offer, categories });
  } catch (error) {
    console.log("Error loading edit offer page:", error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const deleteOffer = async (req, res) => {
  try {
    const offerId = req.params.id;
    await Offers.findByIdAndDelete(offerId);
    res.redirect("/admin/list-offers"); // redirect to list page after deletion
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).send("Internal Server Error");
  }
};

const editOffer = async (req, res) => {
  try {
    const offerId = req.query.id;
    const {
      title,
      description,
      startDate,
      endDate,
      discount,
      categoryId,
      productId,
    } = req.body;

    const offer = await Offers.findById(offerId);
    if (!offer) {
      return res
        .status(404)
        .json({ success: false, message: "Offer not found" });
    }

    // Update basic fields
    offer.name = title;
    offer.description = description;
    offer.startDate = new Date(startDate);
    offer.endDate = new Date(endDate);
    offer.discountPercentage = discount;
    offer.categoryId = categoryId;
    offer.productId = productId;

     // Handle new image upload (compress & replace)
    if (req.file) {
      const uploadDir = path.join(__dirname, "../public/uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Delete old image if exists
      if (offer.image) {
        const oldImagePath = path.join(uploadDir, offer.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Compress and save new image
      const outputFileName = `${Date.now()}-${req.file.originalname}`;
      const outputPath = path.join(uploadDir, outputFileName);

      await sharp(req.file.path)
        .resize({ width: 1080 }) // Optional resize
        .jpeg({ quality: 80 })   // Compress to ~< 500KB
        .toFile(outputPath);

      // Remove temp file
      fs.unlinkSync(req.file.path);

      // Save filename to DB
      offer.image = outputFileName;
    }
    
    await offer.save();

    res
      .status(200)
      .json({ success: true, message: "Offer updated successfully" });
  } catch (error) {
    console.error("Error updating offer:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const returnUpdate = async (req, res) => {
  try {
    const reqId = req.params.id;
    const { status } = req.body;
    const request = await Requests.findByIdAndUpdate(reqId, { status }, { new: true }).populate("userId");
    const orderId = new mongoose.Types.ObjectId(request.orderId);
    if (status === "Approved") {
    const order = await Orders.findByIdAndUpdate(orderId, {status: "Returned"});

          const trackingLink = `https://dtdc.in/tracking/${order.trackingNumber || ""}`;

  await transporter.sendMail({
  from: process.env.EMAIL,
  to: request.userId.email,
  subject: `Your Replacement Request for order ${order.orderId} is Approved`,
  html: `
        <h2>Replacement Request Approved</h2>
        <p>Hi ${request.userId.name},</p>
        <p>Your replacement request for <b>${request.productName}</b> has been <span style="color:green;">approved</span>.</p>
        <p>Your replacement is now on the way. You can track it using the link below:</p>
        <p><a href="${trackingLink}" style="color:blue;">Track Your Order</a></p>
        <p>Order ID: ${order.orderId}</p>
        <br>
        <p>Thank you,<br>Harisree Handlooms Team</p>
      `

    } );
    } else if (status === "Rejected") {
      const order = await Orders.findByIdAndUpdate(orderId, {status: "Delivered"});
    }
    res.redirect("/admin/view-return");
  } catch (err) {
    console.error(err);
    res.status(500).send("Update failed");
  }
};

const viewReview = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const total = await Reviews.countDocuments();
    const totalPages = Math.ceil(total / limit);

    const reviews = await Reviews.find()
      .populate("userId")
      .populate("productId")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.render("admin/viewReview", {
      reviews,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;

    // Find the review to get productId for redirect
    const review = await Reviews.findById(reviewId);
    if (!review) return res.status(404).send("Review not found");

    await Reviews.findByIdAndDelete(reviewId);
    res.redirect("/admin/view-review"); // Or wherever your admin sees the product
  } catch (err) {
    console.error("Delete Review Error:", err);
    res.status(500).send("Internal Server Error");
  }
};

const editProduct = async (req, res) => {
  try {
    const productId = req.query.id;
    if (!productId)
      return res.status(400).json({ message: "Product ID is required" });

    const existingProduct = await Products.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Extract fields from body
    const {
      productName,
      hsnCode,
      price,
      discount,
      description,
      stock,
      lowStockAlert,
      skuId,
      categoryId,
      specification,
      gender,
      size,
      fabric,
      design,
      colour,
    } = req.body;

    const uploadDir = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    let compressedImages = [];

    // Handle uploaded images (compress new ones)
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const inputPath = file.path;
        const outputFileName = `${Date.now()}-${file.originalname}`;
        const outputPath = path.join(uploadDir, outputFileName);

        await sharp(inputPath)
          .resize({ width: 1080 }) // Optional resize
          .jpeg({ quality: 80 }) // Compression
          .toFile(outputPath);

        fs.unlinkSync(inputPath); // Remove original uncompressed image

        compressedImages.push("/uploads/" + outputFileName);
      }
    }

    // Final image list: use new compressed if any, else keep old
    const finalImages =
      compressedImages.length > 0
        ? compressedImages
        : existingProduct.images;

    // Update product fields
    existingProduct.name = productName;
    existingProduct.hsnCode = hsnCode;
    existingProduct.price = price;
    existingProduct.discount = discount;
    existingProduct.description = description;
    existingProduct.stock = stock;
    existingProduct.availableStock = stock; // optional: sync available stock
    existingProduct.lowStockLimit = lowStockAlert;
    existingProduct.skuId = skuId;
    existingProduct.categoryId = categoryId;
    existingProduct.specification = specification;
    existingProduct.gender = gender;
    existingProduct.length = size;
    existingProduct.images = finalImages;
    existingProduct.design = design;
    existingProduct.colour = colour;
    existingProduct.fabric = fabric;

    await existingProduct.save();

    res
      .status(200)
      .json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    console.error("Edit Product Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const exportUsersPDF = async (req, res) => {
  const { startDate, endDate } = req.body;

  try {
    const users = await Users.find({
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }).sort({ createdAt: -1 });

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 40,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="users_${startDate}_${endDate}.pdf"`
    );

    doc.pipe(res);

    // Title
    doc.fontSize(18).text("Customer Report", { align: "center" }).moveDown(1.5);

    // Table Setup
    const tableTop = 100;
    const colWidths = [80, 100, 150, 80, 100, 60, 200]; // widths for each column
    const cols = [
      "ID",
      "Name",
      "Email",
      "Mobile",
      "Created",
      "Orders",
      "Address",
    ];
    let startX = 40;
    let y = tableTop;

    // Header Row
    doc.fontSize(12).font("Helvetica-Bold");
    let x = startX;
    cols.forEach((col, i) => {
      doc.text(col, x, y, { width: colWidths[i], underline: false });
      x += colWidths[i];
    });

    y += 25;

    doc.font("Helvetica");

    users.forEach((user) => {
      let address = "N/A";
      if (user.address?.[0]?.billing) {
        const billing = user.address[0].billing;
        const line = billing.addressLine || "";
        const city = billing.city || "";
        const state = billing.state || "";
        address = `${line}, ${city}, ${state}`
          .trim()
          .replace(/^,|,$/g, "")
          .replace(/,{2,}/g, ",");
        if (!address || address === ", ,") address = "N/A";
      }

      const rowData = [
        user.userId || "N/A",
        user.name || "N/A",
        user.email || "N/A",
        user.mobile || "N/A",
        user.createdAt.toDateString(),
        user.orders?.length || 0,
        address,
      ];

      // 1. Calculate max height required
      let rowHeight = 0;
      rowData.forEach((cell, i) => {
        const height = doc.heightOfString(cell.toString(), {
          width: colWidths[i],
        });
        if (height > rowHeight) rowHeight = height;
      });
      rowHeight += 5;

      // 2. Page break before drawing full row
      if (y + rowHeight > doc.page.height - 40) {
        doc.addPage();
        y = 50;
      }

      let x = startX;
      rowData.forEach((cell, i) => {
        doc.text(cell.toString(), x, y, {
          width: colWidths[i],
          height: rowHeight,
          align: "left",
        });
        x += colWidths[i];
      });

      y += rowHeight;
    });

    doc.end();
  } catch (err) {
    console.error("PDF Export Error:", err);
    res.status(500).send("Error generating PDF");
  }
};

const exportProductsPDF = async (req, res) => {
  const { startDate, endDate } = req.body;

  try {
    const products = await Products.find({
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    })
      .populate("categoryId")
      .sort({ createdAt: -1 });

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 40,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="products_${startDate}_${endDate}.pdf"`
    );

    doc.pipe(res);

    // Title
    doc.fontSize(18).text("Product Report", { align: "center" }).moveDown(1.5);

    // Table Header
    const headers = [
      "ID",
      "Name",
      "Category",
      "HSN",
      "SKU",
      "Price",
      "Created",
    ];
    const colWidths = [80, 150, 100, 80, 100, 80, 100];
    let startX = 40;
    let y = 100;

    doc.font("Helvetica-Bold").fontSize(12);
    headers.forEach((header, i) => {
      doc.text(header, startX, y, { width: colWidths[i], align: "left" });
      startX += colWidths[i];
    });

    y += 25;
    doc.font("Helvetica");

    for (const product of products) {
      const row = [
        product.productId || "N/A",
        product.name || "N/A",
        product.categoryId?.name || "N/A",
        product.hsnCode || "N/A",
        product.skuId || "N/A",
        product.price?.toString() || "N/A",
        product.createdAt.toDateString(),
      ];

      let x = 40;
      row.forEach((text, i) => {
        doc.text(text, x, y, { width: colWidths[i], align: "left" });
        x += colWidths[i];
      });

      y += 25;

      if (y > doc.page.height - 50) {
        doc.addPage();
        y = 50;
      }
    }

    doc.end();
  } catch (err) {
    console.error("PDF Export Error:", err);
    res.status(500).send("Error generating PDF");
  }
};

const exportCategoriesPDF = async (req, res) => {
  const { startDate, endDate } = req.body;

  try {
    const categories = await Categories.find({
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }).sort({ createdAt: -1 });

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 40,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="categories_${startDate}_${endDate}.pdf"`
    );

    doc.pipe(res);

    // Title
    doc.fontSize(18).text("Category Report", { align: "center" }).moveDown(1.5);

    // Table headers
    const headers = ["ID", "Name", "Description", "Created"];
    const colWidths = [100, 100, 380, 100];
    const colX = [40, 140, 240, 620];

    doc.fontSize(12).font("Helvetica-Bold");
    headers.forEach((header, i) => {
      doc.text(header, colX[i], doc.y, { width: colWidths[i] });
    });

    let y = doc.y + 25;
    doc.font("Helvetica").fontSize(10);

    for (const cat of categories) {
      const row = [
        cat.categoryId || "N/A",
        cat.name || "N/A",
        cat.description || "N/A",
        cat.createdAt.toDateString(),
      ];

      // Calculate max lines needed for wrapped text
      const lineCounts = row.map((cell, i) => {
        const options = { width: colWidths[i] };
        return doc.heightOfString(cell, options) / doc.currentLineHeight();
      });
      const maxLines = Math.ceil(Math.max(...lineCounts));
      const rowHeight = maxLines * doc.currentLineHeight() + 10;

      // Check for page break
      if (y + rowHeight > doc.page.height - 40) {
        doc.addPage();
        y = 40;
      }

      row.forEach((cell, i) => {
        doc.text(cell, colX[i], y, {
          width: colWidths[i],
          align: "left",
        });
      });

      y += rowHeight;
    }

    doc.end();
  } catch (err) {
    console.error("PDF Export Error:", err);
    res.status(500).send("Error generating PDF");
  }
};

const exportInventoryPDF = async (req, res) => {
  const { startDate, endDate } = req.body;

  try {
    const products = await Products.find({
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      }
    }).sort({ createdAt: -1 });

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="inventory_${startDate}_${endDate}.pdf"`);

    doc.pipe(res);

    doc.fontSize(18).text("Inventory Report", { align: "center" }).moveDown(1.5);

    // Table headers
    const headers = [
      "Product ID", "Name", "Price", "Discount", "Stock",
      "Shipped", "Available", "Revenue"
    ];
    const tableTop = 100;
    const colSpacing = 90;

    doc.fontSize(12).font("Helvetica-Bold");
    let x = 40;
    headers.forEach(header => {
      doc.text(header, x, tableTop);
      x += colSpacing;
    });

    // Table rows
    let y = tableTop + 25;
    doc.font("Helvetica");

    products.forEach(product => {
      const shipped = product.stock - product.availableStock;
      const revenue = shipped * product.discount;

      const row = [
        product.productId || "N/A",
        product.name || "N/A",
        product.price || "N/A",
        product.discount || "N/A",
        product.stock || 0,
        shipped,
        product.availableStock || 0,
        revenue
      ];

      let x = 40;
      let rowHeight = 0;

  row.forEach((cell, idx) => {
    const textHeight = doc.heightOfString(cell.toString(), {
      width: colSpacing - 5,
    });
    rowHeight = Math.max(rowHeight, textHeight);
  });

  row.forEach((cell, idx) => {
    doc.text(cell.toString(), x, y, {
      width: colSpacing - 5,
      height: rowHeight,
    });
    x += colSpacing;
  });

  y += rowHeight + 10;

  if (y > doc.page.height - 50) {
    doc.addPage();
    y = 50;
  }
});

    doc.end();
  } catch (err) {
    console.error("PDF Export Error:", err);
    res.status(500).send("Error generating PDF");
  }
};

const exportOrdersPDF = async (req, res) => {
  const { startDate, endDate } = req.body;

  try {
    const orders = await Orders.find({
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).populate("userId").populate("items.productId").sort({ createdAt: -1 });

    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="orders_${startDate}_${endDate}.pdf"`);

    doc.pipe(res);

    // Title
    doc.fontSize(18).text("Order Report", { align: "center" }).moveDown(1.5);

    // Table headers
    const tableTop = 100;
    const colWidths = [80, 90, 90, 280, 60, 80, 90]; // adjust as needed
    const headers = ["Order ID", "Created", "Customer ID", "Items", "Total", "Payment", "Status"];
    let x = doc.page.margins.left;

    doc.font("Helvetica-Bold").fontSize(10);
    headers.forEach((header, i) => {
      doc.text(header, x, tableTop, { width: colWidths[i], align: "left" });
      x += colWidths[i];
    });

    let y = tableTop + 25;
    doc.font("Helvetica").fontSize(9);

    orders.forEach(order => {
      const row = [
        order.orderId || "N/A",
        order.createdAt.toLocaleDateString("en-IN"),
        order.userId?.userId || "N/A",
        order.items.map(item => `${item.productId?.name || 'Product'} x${item.quantity} - INR${item.subtotal.toFixed(2)}`).join(", "),
        `INR${order.total.toFixed(2)}`,
        order.paymentStatus || "N/A",
        order.status || "N/A"
      ];

      let rowX = doc.page.margins.left;
      row.forEach((cell, i) => {
        doc.text(cell.toString(), rowX, y, {
          width: colWidths[i],
          align: "left",
          continued: false,
          lineBreak: true
        });
        rowX += colWidths[i];
      });

      y += 30;
      if (y >= doc.page.height - 50) {
        doc.addPage();
        y = 50;
      }
    });

    doc.end();
  } catch (err) {
    console.error("Export Orders PDF Error:", err);
    res.status(500).send("Error generating PDF");
  }
};

const exportCouponsPDF = async (req, res) => {
  const { startDate, endDate } = req.body;

  try {
    const coupons = await Coupons.find({
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    })
      .populate("productId", "name")
      .populate("categoryId", "name")
      .sort({ createdAt: -1 });

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 40,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="coupons_${startDate}_${endDate}.pdf"`
    );

    doc.pipe(res);

    // Title
    doc.fontSize(18).text("Coupon Report", { align: "center" }).moveDown(1.5);

// Table headers
const headers = ["Product", "Category", "Code", "Discount (%)", "Status", "Start Date", "End Date"];
const colWidths = [160, 80, 100, 100, 80, 100, 100];
const colX = [40, 200, 280, 380, 480, 560, 660];

doc.fontSize(12).font("Helvetica-Bold");

let headerY = doc.y;
headers.forEach((header, i) => {
  doc.text(header, colX[i], headerY, {
    width: colWidths[i],
    continued: false,
  });
});

let y = headerY + 25; 

    doc.font("Helvetica").fontSize(10);

    for (const coupon of coupons) {
      const row = [
        coupon.productId?.name || "N/A",
        coupon.categoryId?.name || "N/A",
        coupon.code || "N/A",
        coupon.discountPercentage?.toString() || "N/A",
        coupon.status || "N/A",
        coupon.startDate?.toLocaleDateString("en-GB") || "N/A",
        coupon.endDate?.toLocaleDateString("en-GB") || "N/A",
      ];

      // Calculate max lines needed for wrapped text
      const lineCounts = row.map((cell, i) => {
        const options = { width: colWidths[i] };
        return doc.heightOfString(cell, options) / doc.currentLineHeight();
      });
      const maxLines = Math.ceil(Math.max(...lineCounts));
      const rowHeight = maxLines * doc.currentLineHeight() + 10;

      // Page break check
      if (y + rowHeight > doc.page.height - 40) {
        doc.addPage();
        y = 40;
      }

      // Draw cells
      row.forEach((cell, i) => {
        doc.text(cell, colX[i], y, {
          width: colWidths[i],
          align: "left",
        });
      });

      y += rowHeight;
    }

    doc.end();
  } catch (err) {
    console.error("Coupon PDF Export Error:", err);
    res.status(500).send("Error generating coupon PDF");
  }
};

const exportReviewsPDF = async (req, res) => {
  const { startDate, endDate } = req.body;

  try {
    const reviews = await Reviews.find({
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    })
      .populate("userId")
      .populate("productId")
      .sort({ date: -1 });

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 40,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="reviews_${startDate}_${endDate}.pdf"`
    );

    doc.pipe(res);

    doc.fontSize(18).text("Review Report", { align: "center" }).moveDown(1.5);

    // ✅ Fixed headers and column widths
    const headers = ["#", "User ID", "Product ID", "Rating", "Review", "Date"];
    const colWidths = [30, 100, 100, 60, 320, 100];
    const colX = [40, 70, 180, 290, 360, 700];

    doc.font("Helvetica-Bold").fontSize(12);

const headerY = doc.y; // 💡 fix Y to avoid cascading down

headers.forEach((header, i) => {
  doc.text(header, colX[i], headerY, { width: colWidths[i], align: "left" });
});

let y = headerY + 25; // 🧱 start row drawing from here

    doc.font("Helvetica").fontSize(10);

    for (let i = 0; i < reviews.length; i++) {
      const review = reviews[i];
      const row = [
        i + 1,
        review.userId?.userId || "N/A",
        review.productId?.productId || "N/A",
        review.rating?.toString() || "N/A",
        review.review || "N/A",
        review.date.toDateString(),
      ];

      const lineCounts = row.map((cell, idx) => {
        return Math.ceil(
          doc.heightOfString(cell.toString(), { width: colWidths[idx] }) / doc.currentLineHeight()
        );
      });

      const maxLines = Math.max(...lineCounts);
      const rowHeight = maxLines * doc.currentLineHeight() + 10;

      if (y + rowHeight > doc.page.height - 40) {
        doc.addPage();
        y = 40;
      }

      row.forEach((cell, idx) => {
        doc.text(cell.toString(), colX[idx], y, {
          width: colWidths[idx],
          align: "left",
        });
      });

      y += rowHeight;
    }

    doc.end();
  } catch (err) {
    console.error("PDF Export Error:", err);
    res.status(500).send("Error generating review report");
  }
};

const exportReportPDF = async (req, res) => {
  const { startDate, endDate } = req.body;

  try {
    const products = await Products.find({
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      }
    }).sort({ createdAt: -1 });

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="report_${startDate}_${endDate}.pdf"`);

    doc.pipe(res);

    doc.fontSize(18).text("Warehouse Report", { align: "center" }).moveDown(1.5);

    const headers = [
      "Product ID", "Name", "Price", "Discount",
      "Stock", "Shipped", "Available", "Revenue"
    ];

    const tableTop = 100;
    const colSpacing = 90;
    let x = 40;

    doc.fontSize(12).font("Helvetica-Bold");
    headers.forEach(header => {
      doc.text(header, x, tableTop);
      x += colSpacing;
    });

    let y = tableTop + 25;
    doc.font("Helvetica");

    products.forEach(product => {
      const shipped = product.stock - product.availableStock;
      const revenue = shipped * product.discount;

      const row = [
        product.productId || "N/A",
        product.name || "N/A",
        product.price || "N/A",
        product.discount || "N/A",
        product.stock || 0,
        shipped,
        product.availableStock || 0,
        revenue
      ];

      let x = 40;
      let rowHeight = 0;

      row.forEach(cell => {
        const textHeight = doc.heightOfString(cell.toString(), { width: colSpacing - 5 });
        rowHeight = Math.max(rowHeight, textHeight);
      });

      row.forEach(cell => {
        doc.text(cell.toString(), x, y, { width: colSpacing - 5 });
        x += colSpacing;
      });

      y += rowHeight + 10;

      if (y > doc.page.height - 50) {
        doc.addPage();
        y = 50;
      }
    });

    doc.end();
  } catch (err) {
    console.error("PDF Export Error:", err);
    res.status(500).send("Error generating PDF");
  }
};

const createDTDCShipment = async (req, res) => {
  console.log("Creating DTDC Shipment...");
  try {
    const orderId = req.query.id;
    const order = await Orders.findById(orderId)
      .populate("items.productId")
      .populate("userId");
    console.log("📦 Creating DTDC Shipment for Order ID:", orderId);

    const payload = {
      consignments: [
        {
          customer_code: process.env.DTDC_CUSTOMER_CODE,
          service_type_id: "B2C PRIORITY",
          load_type: "NON-DOCUMENT",
          description: "Order from Harisree Handlooms",
          dimension_unit: "cm",
          length: "30",
          width: "25",
          height: "10",
          weight_unit: "kg",
          weight: "1",
          declared_value: order.total.toString(),
          num_pieces: order.items.length.toString(),

          origin_details: {
            name: "Harisree Handlooms",
            phone: "9188019689",
            address_line_1: "Kallanchari, Peruvamba",
            pincode: "678531",
            city: "Palakkad",
            state: "Kerala",
          },

          destination_details: {
            name: order.address.name,
            phone: order.address.phone,
            address_line_1: order.address.line,
            pincode: order.address.pincode,
            city: order.address.city,
            state: order.address.state,
          },

          customer_reference_number: order.orderId,
          commodity_id: "38",
          is_risk_surcharge_applicable: false,
          reference_number: "I74518944",
        },
      ],
    };
    console.log("📦 Booking Shipment with payload:", JSON.stringify(payload, null, 2));
    const response = await axios.post(
      "https://dtdcapi.shipsy.io/api/customer/integration/consignment/softdata",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.DTDC_API_KEY,
        },
      }
    );
    console.log("📦 Shipment Booked:", response.data);
    const refNo = response.data.data[0].reference_number;

    await Orders.findByIdAndUpdate(orderId, {
      $set: {
        dtdcTrackingNumber: refNo,
        shippingStatus: "Shipment Booked",
        shipmentBookedAt: new Date(),
      },
    });

    res.redirect(`/admin/order-details?id=${orderId}`);
  } catch (error) {
    console.error(
      "📦 Shipment Booking Failed:",
      error.response?.data || error.message
    );
    res.status(500).send("Failed to book shipment");
  }
};

const downloadDTDCLabel = async (req, res) => {
  const { refNo } = req.query;

  try {
    const response = await axios.get(
      `https://dtdcapi.shipsy.io/api/customer/integration/consignment/shippinglabel/stream`,
      {
        params: {
          reference_number: refNo,
          label_code: "SHIP_LABEL_4X6",
          label_format: "pdf",
        },
        headers: {
          "api-key": process.env.DTDC_API_KEY,
        },
        responseType: "arraybuffer",
      }
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=label-${refNo}.pdf`
    );
    res.send(response.data);
  } catch (error) {
    console.error("Label fetch error:", error.message);
    res.status(500).send("Error downloading shipping label");
  }
};

const trackDTDCShipment = async (req, res) => {
  const { refNo } = req.query;

  if (!refNo) {
    return res.status(400).json({ error: "Missing DTDC reference number" });
  }

  try {
    // Step 1: Make the tracking API call
    const response = await axios.post(
      `https://blktracksvc.dtdc.com/dtdc-api/rest/JSONCnTrk/getTrackDetails`,
      {
        trkType: "cnno",
        strcnno: refNo,
        addtnlDtl: "Y",
      },
      {
        headers: {
          "X-Access-Token": process.env.DTDC_TRACK_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    const trackInfo = response.data;

    if (!trackInfo.trackDetails || !trackInfo.trackDetails.length) {
      return res.status(404).json({ error: "No tracking details found" });
    }

    const latestEvent = trackInfo.trackDetails[0];

    // Extract latest status & remarks
    const currentStatus = latestEvent.strStatus || "In Transit";
    const remarks = latestEvent.strRemarks || "Status Updated";

    // Step 2: Update the corresponding order
    await Orders.findOneAndUpdate(
      { dtdcTrackingNumber: refNo },
      {
        $set: {
          shippingStatus: currentStatus, // e.g., "Delivered", "In Transit"
          lastTrackingUpdate: new Date(),
          deliveryRemarks: remarks,
        },
      }
    );

    console.log("✅ Order updated with latest DTDC status:", currentStatus);

    // Step 3: Respond to the client
    return res.json({
      status: currentStatus,
      remarks: remarks,
      trackingDetails: trackInfo.trackDetails,
    });
  } catch (err) {
    console.error("❌ Tracking failed:", err.response?.data || err.message);
    return res.status(500).json({ error: "Tracking failed" });
  }
};

const cancelDTDCShipment = async (req, res) => {
  const { awb } = req.body;

  try {
    const response = await axios.post(
      `http://dtdcapi.shipsy.io/api/customer/integration/consignment/cancel`,
      {
        AWBNo: [awb],
        customerCode: process.env.DTDC_CUSTOMER_CODE,
      },
      {
        headers: {
          "api-key": process.env.DTDC_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Cancellation failed:", error.message);
    res.status(500).send("Cancellation failed");
  }
};

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
  deleteCategory,
  deleteProduct,
  addCategory,
  addProduct,
  editCategory,
  viewProductsByCategory,
  updateSlider,
  addCoupon,
  updateOfferTagline,
  viewEditCoupon,
  editCoupon,
  deleteCoupon,
  addOffer,
  viewEditOffer,
  deleteOffer,
  editOffer,
  returnUpdate,
  editProduct,
  viewReview,
  deleteReview,
  exportUsersPDF,
  exportProductsPDF,
  exportCategoriesPDF,
  exportInventoryPDF,
  exportOrdersPDF,
  exportCouponsPDF,
  exportReviewsPDF,
  exportReportPDF,
  createDTDCShipment,
  downloadDTDCLabel,
  trackDTDCShipment,
  cancelDTDCShipment,
};
