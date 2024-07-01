const adminModel = require('../models/adminModel');
const WalletTransaction = require('../models/WalletTransaction');

const crTransaction = async (userId, amount, transactionType, commissionId= null, requestedPersonId = null, isWithDrawable = false) => {
    console.log(userId, amount, transactionType);
    const userDetail = await adminModel.findOne({ _id: userId });
    if (!userDetail) {
        return { status: false, message: 'User not valid.' };
    }
    const updatedWallet = await adminModel.findOneAndUpdate({ _id: userId }, { $inc: { wallet_balance: amount } });

    const transaction = await WalletTransaction.create({
        user_id: userDetail._id,
        amount_type: 'cr',
        amount: amount,
        balance_before: Number(userDetail.wallet_balance),
        balance_after: Number(userDetail.wallet_balance) + Number(amount),
        transaction_type: transactionType,
        commision_id: commissionId,
        is_withdrawable: isWithDrawable
    });
  
    return { status: true, message: 'Transaction Add', balance: Number(userDetail.wallet_balance) + Number(amount) };
}

const drTransaction = async (userId, amount, transactionType, commisionId = null) => {
    const userDetail = await adminModel.findOne({ _id: userId });
    if (!userDetail) {
        return { status: false, message: 'admin not valid.' };
    }
    const updatedWallet = await adminModel.findOneAndUpdate({ _id: userId }, { $inc: { wallet_balance: -amount } });

    if (userDetail.wallet_balance < amount) {
        return { status: false, message: 'Insufficient Balance.' };
    }

    const transaction = await WalletTransaction.create({
        user_id: userDetail._id,
        amount_type: 'dr',
        amount: amount,
        balance_before: Number(userDetail.wallet_balance),
        balance_after: Number(userDetail.wallet_balance) - Number(amount),
        transaction_type: transactionType,
        commision_id: commisionId,
        is_withdrawable: false
    });

    return { status: true, message: 'Transaction Add', balance: Number(userDetail.wallet_balance) - Number(amount) };
}


module.exports = {
    crTransaction,
    drTransaction
};

