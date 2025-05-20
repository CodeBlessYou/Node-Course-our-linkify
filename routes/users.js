const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/users");
const auth = require("../middleware/auth");
const router = express.Router();

router.post("/", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ message: "Missing required form fields!", success: false });
  }

  const user = await User.findOne({
    $or: [{ username: username }, { email: email }],
  });

  if (user) {
    return res.status(400).json({
      message:
        user.username === username
          ? "Username is already taken!"
          : "Email is already registered!",
      success: false,
    });
  }

  const hashedPass = await bcrypt.hash(password, 10);

  const newUser = new User({
    username,
    email,
    password: hashedPass,
  });

  await newUser.save();

  const token = generateToken({
    _id: newUser._id,
    username: newUser.username,
  });

  res.status(201).json(token);
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide username and password!",
    });
  }

  const user = await User.findOne({ username });
  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials!" });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials!" });
  }

  const token = generateToken({
    _id: user._id,
    username: user.username,
  });

  res.json(token);
});

router.get("/", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found!" });
  }

  res.json(user);
});

const generateToken = (data) => {
  return jwt.sign(data, process.env.JWT_KEY);
};

module.exports = router;
