const mongoose = require('mongoose');
const WalletTransaction = require('../models/WalletTransaction.js');
const User = require('../models/UserModel.js')

const availableWalletBalance = async (userId) => {
    const userDetail = await User.findOne({ _id: userId });
    if (!userDetail) {
        return false;
    }
    return userDetail.wallet_balance;
}

const withdrawableBalance = async (userId) => {
    const UserData = await User.findOne({ _id: userId });
    if (!UserData) {
        return false;
    }
    return UserData.Current_withdable_amount;
}

const crTransaction = async (userId, amount, transactionType, isWithDrawable = false) => {
    console.log(userId, amount, transactionType);
    const userDetail = await User.findOne({ _id: userId });
    if (!userDetail) {
        return { status: false, message: 'User not valid.' };
    }
    if(transactionType==='referral'){
        const updatedWallet = await User.findOneAndUpdate({ _id: userId }, { $inc: { total_Referral_Earned_amount: amount,wallet_balance: amount } });
    }else{
        if(transactionType==='winning_amount' ){
            const updatedWallet = await User.findOneAndUpdate({ _id: userId }, { $inc: {wallet_balance: amount, total_winning_amount: amount ,Current_withdable_amount:amount} });
        }else if (transactionType==='reject_withdraw'){
            const updatedWallet = await User.findOneAndUpdate({ _id: userId }, { $inc: { wallet_balance: amount, Current_withdable_amount:amount} });
        }else{
            const updatedWallet = await User.findOneAndUpdate({ _id: userId }, { $inc: { wallet_balance: amount } });
        }
    }
    const transaction = await WalletTransaction.create({
        user_id: userDetail._id,
        amount_type: 'cr',
        amount: amount,
        balance_before: Number(userDetail.wallet_balance),
        balance_after: Number(userDetail.wallet_balance) + Number(amount),
        transaction_type: transactionType,
        is_withdrawable: isWithDrawable
    });
    return { status: true, message: 'Transaction Add', balance: Number(userDetail.wallet_balance) + Number(amount) };
}

const drTransaction = async (userId, amount, transactionType) => {
    
    const userDetail = await User.findOne({ _id: userId });
    
    if (!userDetail) {
        return { status: false, message: 'User not valid.' };
    }
    // console.log('here in dr transaction',(userDetail.wallet_balance-userDetail?.Current_withdable_amount),userDetail.wallet_balance,userDetail?.Current_withdable_amount  )
    // //doubt hai Iddher 
    if (userDetail.wallet_balance < amount) {
        return { status: false, message: 'Insufficient Balance.' };
    }
      
    if(transactionType ==='withdraw_request' ||  transactionType ==='entry_amount_fwa'){
        console.log("111111111111")
        const updatedWallet = await User.findOneAndUpdate({ _id: userId }, { $inc: { wallet_balance: -amount,Current_withdable_amount:-amount } })//.then(r=>{console.log(r)});
    }else{
        const updatedWallet = await User.findOneAndUpdate({ _id: userId }, { $inc: { wallet_balance: -amount } });
    }
    const transaction = await WalletTransaction.create({
        user_id: userDetail._id,
        amount_type: 'dr',
        amount: amount,
        balance_before: Number(userDetail.wallet_balance),
        balance_after: Number(userDetail.wallet_balance) - Number(amount),
        transaction_type: transactionType,
        is_withdrawable: false
    });

    return { status: true, message: 'Transaction Add', balance: Number(userDetail.wallet_balance) - Number(amount) };
}


module.exports = {
    availableWalletBalance,
    withdrawableBalance,
    crTransaction,
    drTransaction
};

