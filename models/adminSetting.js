const mongoose = require('mongoose');

// Define schema for the document
const admin_Setting = new mongoose.Schema({
  name: {
    type: String,
    enum:["WalletRecharge",
          "withdrawLimit",
          "Referrer_Reward_Amount",
          "Referee_Reward_Amount",
          "User_Referral_Limit"     //how many users can be referred by one referral code 
        ],
    required: [true, "name is required."]
  },
  minValue:{type: Number ,default: 0,},
  maxValue: {type: Number},
  Value: {type: Boolean},
  publicMessage: {type: String}
});

// Create the Mongoose model
const AdminSettings = mongoose.model('AdminSetting', admin_Setting);

module.exports = AdminSettings;
