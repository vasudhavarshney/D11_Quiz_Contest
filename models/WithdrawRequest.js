const mongoose = require('mongoose');
const validator = require('validator');


const withdrawRequestSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Types.ObjectId,
        required: [true, "User is required."],
        ref:"User"
    },
    amount: {
        type: Number,
        required: [true, "Amount is required."],
        default: 0,
    },
    status: {
        type: String,
        enum: ['under_process', 'approved', 'rejected'],
        default: 'under_process',
    },
    bank_detail: {
        type: Object,
        default: null
    },
    assignId: {
        type: mongoose.Types.ObjectId,
        required: [true, "User is required."],
    },
    remarks: {
        type: String,
        default: null
    }
}, { timestamps: true })

module.exports = mongoose.model('WithdrawRequest', withdrawRequestSchema);