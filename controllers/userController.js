const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Users = require("../models/userModel");

const viewHomepage = async (req, res) => {
  try {
    res.render("user/home", { });
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

    res.render("user/signin", { message: "" });
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
        message: "Invalid credentials",
        messageType: "danger",
      });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.render("user/signin", {
        message: "Invalid credentials",
        messageType: "danger",
      });

    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
      expiresIn: "7d",
    });

    req.session.token = token;
    req.session.user = user._id;

    const redirectUrl = req.session?.originalUrl || "/";
    if (req.session) delete req.session.originalUrl;

    return res.json({
      success: true,
      message: "Login successful",
      redirect: redirectUrl,
    });
    
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

module.exports = {
  viewHomepage,
  viewSignin,
  viewSignup,
  signIn,
  signOut,
  signUp,

}