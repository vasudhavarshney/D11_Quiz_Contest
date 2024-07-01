const mongoose = require("mongoose");


const adminSchema = mongoose.Schema(
  {
    email: {
      type: String,
      default: null,
    },
    loginId: {
      type: String,
      unique: true,
      required: [true, "Please provide loginId"],
    },
    name: {
      type: String,
      required: [true, "Please provide name"],
    },
    password: {
      type: String,
      required: [true, "Please provide password"],
    },
    role: {
      type: String,
      default: null,
    },
    mobile: {
      type: Number,
      required: true,
    },
    wallet_balance: {
        type: Number,
        default: 0,
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Admin", adminSchema);
