const mongoose = require('mongoose');
const validator = require('validator');


const BankSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: [true, "User is required."],
    },
    bank: {
        type: String,
        required: [true, "Bank name is required."],
    },
    ifsc_code: {
        type: String,
        required: [true, "Bank IFSC Code is required."],
    },
    ac_no: {
        type: String,
        required: [true, "Account number is required."],
    },
    ac_holder_name: {
        type: String,
        required: false,
        default:null
    },
    is_default: {
        type: Boolean,
        default: 0
    },
    is_active: {
        type: Boolean,
        default: 1
    },
    qrImage:{
        type: String,
        required:false,
        default: null
    },
    upi_id:{
        type: String,
        required:false,
        default: null
    }
}, { timestamps: true })

module.exports = mongoose.model('BankDetail', BankSchema);