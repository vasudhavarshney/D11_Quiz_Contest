const mongoose = require('mongoose');
const validator = require('validator');


const fundRquestSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: [true, "User is required."],
    },
    amount: {
        type: Number,
        required: [true, "Amount is required."],
        default: 0,
    },
    image: {
        type: String,
        required: true
    },
    assignId: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    remarks: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['under_process', 'approved', 'rejected'],
        default: 'under_process',
    },
}, { timestamps: true })

module.exports = mongoose.model('FundRequest', fundRquestSchema);