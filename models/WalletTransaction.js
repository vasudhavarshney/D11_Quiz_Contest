const mongoose = require('mongoose');
const validator = require('validator');


const WalletSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: [true, "User is required."],
    },
    amount_type: {
        type: String,
        enum: ['cr', 'dr'],
        default: 'dr',
    },
    amount: {
        type: Number,
        required: [true, "Amount is required."],
        default: 0,
    },
    balance_before: {
        type: Number,
        required: true
    },
    balance_after: {
        type: Number,
        required: true
    },
    transaction_type: {
        type: String,
        enum: [
                'wallet_Recharge',
                'withdraw_request',
                'winning_amount', 
                'referral',
                'entry_amount',
                'entry_amount_fwa',
                'direct_debit',
                'direct_credit',
                'approve_withdraw',
                'reject_withdraw'
            ],
        default: 'bet_amount',
    },
    commision_id: {
        type: mongoose.Types.ObjectId,
        default: null
    },
    is_withdrawable: {
        type: Boolean,
        // fund_request, wining_amount
    
        default: false
    }
}, { timestamps: true })

module.exports = mongoose.model('WalletTransaction', WalletSchema);