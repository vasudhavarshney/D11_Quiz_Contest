//Import Environment Variables
const dotenv = require('dotenv');
dotenv.config();

//Import Configured Files
const { attachCookiesToResponse, createToken } =require('../utilities/jwt.js');
const { availableWalletBalance, withdrawableBalance,crTransaction,drTransaction } =require('../utilities/userBalanceUtil.js');
const { drTransaction: admin_drTransaction, crTransaction: admin_crTransaction } = require("../utilities/adminBalanceUtils.js");

//Import Models
const UserModel = require('../models/UserModel.js');
const admin = require('../models/adminModel.js');
const adminSetting  = require('../models/adminSetting.js');
const Token = require('../models/TokenSchema.js')
const Quiz = require('../models/quizModel.js');
const Contest = require('../models/contestModel.js');
const Pool = require('../models/poolModel.js');
const FundRequest= require('../models/FundRequest.js');
const WithdrawRequest = require('../models/WithdrawRequest.js');
const UserBankDetail = require('../models/bankDetails.js');
const bankDetails = require('../models/bankDetails.js');


//Import Installed Libaries here 
const _ = require('lodash');
const { StatusCodes } = require("http-status-codes");
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const path = require('path');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');





const Login = async (req, res) => {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) {
        return res.status(404).json({"status":false, "message":"User not exist."})
    }
    const isPasswordCorrect =await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Email Or Password Is Not Correct",
        status: false,
      });
    }

    const tokenUser = createToken(user);

    // create refresh token
    let refreshToken = crypto.randomBytes(40).toString('hex');
    // check for existing token expire it
    const userAgent = req.headers['user-agent'];
    const ip = req.ip;
    const userToken = { refreshToken, ip, userAgent, user: user._id };
    await Token.create(userToken);
    const { refreshTokenJWT, accessTokenJWT } = attachCookiesToResponse({ res, user: tokenUser, refreshToken });
    // access_token: accessTokenJWT, referesh_token: refreshTokenJWT
    res.status(StatusCodes.OK).json({ user: tokenUser, access_token: accessTokenJWT, referesh_token: refreshTokenJWT, status: true,  message: "Auth Success" });

}

const logout = async (req, res) => {
    await Token.findOneAndDelete({ user: req.user.userId });

    res.cookie('accessToken', 'logout', {
        httpOnly: true,
        expires: new Date(Date.now()),
    });
    res.cookie('refreshToken', 'logout', {
        httpOnly: true,
        expires: new Date(Date.now()),
    });
    res.status(StatusCodes.OK).json({ message: 'user logged out!', status: true });
};

const register = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({status:false, errors: errors.array() });
    }

    const { name, email, mobile, password,referral_code } = req.body;
    try{
        let isValid_referral_code =await UserModel.findOne({ referral_code });
        const referralAdminDetails = await adminSetting.find({name:{$ne:"WalletRecharge"}}).select('-_id');
        const User_Referral_Limit= referralAdminDetails.find(e=>{return e.name==="User_Referral_Limit"})
        const Referee_Reward_Amount= referralAdminDetails.find(e=>{return e.name==="Referee_Reward_Amount"})
        const Referrer_Reward_Amount= referralAdminDetails.find(e=>{return e.name==="Referrer_Reward_Amount"})
        
         if(referral_code){
            if(!isValid_referral_code){
                return res.status(400).json({ status:false,errors: [{ msg: 'invalid referral Code' }] });
            }
            if(isValid_referral_code.Referred_User_Count>User_Referral_Limit.maxValue){
                return res.status(400).json({ status:false,errors: [{ msg: 'The referral usage limit for the applied referral code has been exceeded!' }] });
            }

         }
         (isValid_referral_code)?isValid_referral_code.Referred_User_Count+=1:null;

         let user = await UserModel.findOne({ mobile });
         if (user) {
             return res.status(400).json({ status:false,errors: [{ msg: 'User with this mobile number already exists' }] });
         }
        
         user = new UserModel({
             name,
             email,
             mobile,
             password,
             referred_by:(isValid_referral_code)?{"user_id":isValid_referral_code._id,"userName":isValid_referral_code.name}:null

         });
         const resultedUser = await user.save().then(r=>{ return r});
         if(isValid_referral_code){
            const defaultAdmin = await admin.findOne({});

            await admin_drTransaction(defaultAdmin._id,Referrer_Reward_Amount.maxValue,"direct_debit",isValid_referral_code._id)
            await crTransaction(isValid_referral_code._id,Referrer_Reward_Amount.maxValue,"referral")

            await admin_drTransaction(defaultAdmin._id,Referee_Reward_Amount.maxValue,"direct_debit",resultedUser._id)
            await crTransaction(resultedUser._id, Referee_Reward_Amount.maxValue, "referral")
         }
         (isValid_referral_code)? await isValid_referral_code.save() : null ;
         
 
         res.status(200).json({status:true, msg: 'User registered successfully' });
    }catch(err){
        console.error(err);
        res.status(500).json({status:false, message:err.message});
    }
}

const getUserProfile = async (req, res, next) => {
    try {
        const userId = req.user.userId; 
        const user = await UserModel.findById(userId);

        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }
        const userProfile = {
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            image: user.image,
            wallet_balance: user.wallet_balance,
            referral_code:user.referral_code,
            total_Referral_Earned_amount:user.total_Referral_Earned_amount,
            // total_winning_amount:user.total_winning_amount,
            // Current_withdable_amount:user.Current_withdable_amount,
            

        }
        res.status(200).json({ status: true,message:"User profile fetched Successfully", profile: userProfile });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: err.message });
    }
}

const updateUserProfile = async (req, res, next) => {
    try {
        
        const userId = req.user.userId; 
        let user = await UserModel.findById(userId);
        
        if (!user) {
            return res.status(404).json({ status: false, message: 'User not found' });
        }

        if (req.body.name) {
            user.name = req.body.name;
        }
        if (req.body.mobile) {
            user.mobile = req.body.mobile;
        }
        if (req.files?.image) {
            const maxSize = 1024 * 1024;
            const image = req.files.image;
            switch (true) {
                case !image.mimetype.startsWith('image'):
                    formErrors.image = 'Please Upload Image';
                    valid = false
                    break;
                case image.size > maxSize:
                    formErrors.image = 'Please upload image smaller than 1MB';
                    valid = false
                    break;
            }
            const fileName = userId + '_' + req.files.image.name;

            const imagePath = path.join(
                __dirname,
                '../public/uploads/user/' + `${fileName}`
            );
            await req.files.image.mv(imagePath);
            user.image = `public/uploads/user/${fileName}`
        }
    
        user = await user.save();
        res.status(200).json({ status: true, message: 'Profile updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: err.message });
    }
};

const joinContest = async (req, res, next) => {
    try {
        const {userId} = req.user;
        const {contestId} = req.params;
        const { poolId } = req.query;
        const fwaConfirmation = Number(req.query.confirm);
        const userDetails = await UserModel.findOne({_id:userId})
        console.log(userDetails)
        if(!contestId){
            return res.status(404).json({status:false,message:"Contest Id is required"})
        }
        const contestDetail = await Contest.findOne({_id:contestId})
        if(!poolId){
            return res.status(404).json({status:false,message:"Pool Id is required"})
        }
        if(!contestDetail){
            return res.status(404).json({status:false,message:"Contest Not Found: Invalid Contest Id"})
        }else{
            if(contestDetail.endTime<Date.now() || contestDetail.resultsDeclared){
                return res.status(404).json({status:false,message:"This contest has been closed"})
            }
            if(!(contestDetail.pools.some(pool => pool.equals(new mongoose.Types.ObjectId(poolId))))){
                return res.status(404).json({status:false,message:"Pool Not Found: Invalid Pool Id"})
            }
            const existingSubmissionCount = await Quiz.countDocuments({"userId":userId,"contestId":contestId})
            if(existingSubmissionCount>0){
                return res.status(404).json({status:false,message:"Only one submission is permitted per Contest, and you've already participated in this one"})
            }

        }
        //vasudha
        const defaultadmin = await admin.findOne({})
        const pool_entry_fee= await Pool.findOne({_id:poolId}).then(r=>{return r.entryFee});
        if((userDetails.wallet_balance - pool_entry_fee )>= userDetails.Current_withdable_amount ){
            await drTransaction(userId,pool_entry_fee,"entry_amount")//entry_amount deduction form user wallet
        }else {
            if(fwaConfirmation===1){
                await drTransaction(userId,pool_entry_fee,"entry_amount_fwa")//entry_amount deduction form user wallet
            }else{
                const action =(userDetails.Current_withdable_amount>=pool_entry_fee)?{action:"Try to joint again with confirm=1 in query parameters for allowing using your winning amount for quiz entry_fee"}:{}
                return res.status(404).json({status:false,message:"Insufficient Deposit Balance",...action})
            }

        }
        
        await admin_crTransaction(defaultadmin._id,pool_entry_fee,"entry_amount")//entry_amount credited to admin wallet
        const quiz = new Quiz({
            userId,
            poolId,
            contestId,
            answers:[]
        });
        await quiz.save();
        await Pool.updateOne({_id: quiz.poolId},{$inc:{ActualUserCount:1}})
        res.status(201).json({ status: true, message: 'Joined contest successfully', quiz });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: false, message: err.message });
    }
};

const GetQuizeByQuizId= async (req, res, next) => {
    try{
        const { QuizId } = req.params;
        const quiz = await Quiz.findOne({_id:QuizId}).populate({
            path: 'contestId',
            select: 'questions _id startTime endTime resultsDeclared' ,
            options: { lean: true },
          }).select("-answers");
          if (!quiz) {
            return res.status(404).json({ status: false, message: 'Unable to load Quiz' });
        }
        if(quiz.contestId === null){
            return res.status(404).json({ status: false, message: 'Unable to load Quiz: Contest Details Not Found' });
        }
        if (quiz.contestId?.startTime>Date.now()) {
            return res.status(404).json({ status: false, message: 'Unable to load the quiz as the Quiz Contest has not started yet' });
        }
        res.status(200).json({ status: true, message: 'Quiz loaded Sucessfully',data:quiz });
    }catch(err){
        console.error(err);
        res.status(500).json({status:false, message:err.message});
    }
};

const getQuizByUserId = async (req, res, next) => {
    try{
        const { UserId } = req.params;
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 10; 
    
        const options = {
            page: page,
            limit: limit,
            populate:[
                {
                    path: 'contestId',
                    select: '_id title banner startTime endTime resultsDeclared questions._id'
                },
                {
                    path: 'poolId',
                    select: '_id banner ActualUserCount'
                }
            ],
            
        };
    
        const quiz = await Quiz.paginate({userId:UserId}, options);
        const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;
        const totalDocuments = quiz.totalDocs;
        const totalPage = quiz.totalPages;
        const nextPage = quiz.nextPage ? `${baseUrl}?page=${pool.nextPage}&limit=${limit}` : null;
        const prevPage = quiz.prevPage ? `${baseUrl}?page=${pool.prevPage}&limit=${limit}` : null;
        const quizdata = quiz.docs
        

        res.status(200).json({
            status: true,
            quiz: quizdata,
            pagination: {
                totalDocuments: totalDocuments,
                totalPage: totalPage,
                page: page,
                limit: limit,
                nextPageLink: nextPage,
                prevPageLink: prevPage
            }
        })
        
    }catch(err){
        console.error(err);
        res.status(500).json({status:false, message:err.message});
    }
};

const Submit_Quiz = async (req, res, next) => {
    try{
        const { QuizId }= req.params
        const { answers }= req.body
        const user =  req.user.userId
        const QuizDetails = await Quiz.findOne({userId: user,_id:QuizId})

        if(!QuizDetails){
            return res.status(404).json({status:false,message:"Invalid QuizId"})
        }
        if(QuizDetails.submitted){
            return res.status(404).json({status:false,message:"You have already Submitted your Answers"})
        }

        QuizDetails.submitted= !QuizDetails.submitted;
        QuizDetails.answers= answers
        await QuizDetails.save();
        res.status(200).json({
            status: true,
            message:"Your Answers submitted successfully.Thank you for your participation."
        })
    }catch(err){
        console.error(err);
        res.status(500).json({status:false, message:err.message});
    }
}

const addFundRequest = async (req, res) => {
    const user = req.user.userId;
    const UserDetails = await UserModel.findById(user);
    const adminRechargeLimit  = await admin.findOne({name:"WalletRecharge"})
    const { amount} = req.body;
    const minAmount = adminRechargeLimit.maxValue;
    const uploadImage = req.files.image;
    let formErrors = {};
    switch (true) {
        case !amount:
            formErrors.amount = 'Amount is required.'
            break;
        case isNaN(Number(amount)) || amount <= 0:
            formErrors.amount = 'Amount is not a valid.'
            break;
        case minAmount > Number(amount):
            formErrors.amount = 'Amount should be greater than or equal to ' + minAmount + '.';
            break;
    }

    const maxSize = 1024 * 1024;
    switch (true) {
        case !req.files:
            formErrors.image = 'No File Uploaded';
            break;
        case !uploadImage.mimetype.startsWith('image'):
            formErrors.image = 'Please Upload Image';
            break;
        case uploadImage.size > maxSize:
            formErrors.image = 'Please upload image smaller than 1MB';
            break;
    }

    if (!_.isEmpty(formErrors)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Validation Error occurs.", formErrors: formErrors, status: false });
    }
    const fileName = new Date().getTime() + '_' + uploadImage.name;

    const imagePath = path.join(
        __dirname,
        '../public/uploads/fund-requests/' + `${fileName}`
    );
    const defaultAdmin = await admin.findOne({})
    await uploadImage.mv(imagePath);
    const fundRequest = await FundRequest.create({
        user_id: user,
        amount: amount,
        assignId:defaultAdmin._id,
        image: `/public/uploads/fund-requests/${fileName}`,
        status: 'under_process'
    }).then(async(sucess)=>{
        console.log(sucess)
        return sucess
      }).catch(err=>{
        return "Something went wrong!!"+err
      });
    return res.status(StatusCodes.OK).json({ data: fundRequest, message: 'Fund request successfully added.', status: true });
};

const addWithdrawRequest = async (req, res) => {
    const adminWithdrawalLimit  = await admin.findOne({name:"WalletRecharge"})
    const minAmount = adminWithdrawalLimit.maxValue;
    const user = req.user.userId;
    const userDetail = await UserBankDetail.findOne({ user_id: user }).select('bank ifsc_code ac_no ac_holder_name -_id');
    if (!userDetail) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "To proceed with withdrawals, please ensure your bank details are added to your account.", status: false });
    }

    const { amount } = req.body;

    let formErrors = {};
    const withdrableAmount = await withdrawableBalance(user);
    switch (true) {
        case !amount:
            formErrors.amount = 'Amount is required.'
            break;
        case isNaN(Number(amount)) || amount <= 0:
            formErrors.amount = 'Amount is not a valid.'
            break;
        case minAmount > Number(amount):
            formErrors.amount = 'Amount should be greater than or equal to ' + minAmount + '.';
            break;
        case withdrableAmount <= Number(amount):
            formErrors.amount = 'Available withdrawable amount is ' + withdrableAmount + '.';
            break;
    }

    if (!_.isEmpty(formErrors)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Validation Error occurs.", formErrors: formErrors, status: false });
    }
    const defaultAdmin = await admin.findOne({})
    const withDrawRequest = await WithdrawRequest.create({
        user_id: user,
        amount: amount,
        status: 'under_process',
        bank_detail: userDetail,
        assignId:defaultAdmin._id
    }).then(async(sucess)=>{
        // console.log(sucess)
        await drTransaction(user,amount,'withdraw_request').then(r=>{
            if(!r.status){
                throw new Error(r.message);
            }
        })
        return sucess
      }).catch(err=>{
        return "Something went wrong!!"+err
      });
    return res.status(StatusCodes.OK).json({ data: withDrawRequest, message: 'Withdraw request successfully added.', status: true });
}

const availableBalance = async (req, res) => {
    const user = req.user.userId;
    const availableBalance = await availableWalletBalance(user);
    return res.status(StatusCodes.OK).json({
        message: "Wallet Ballance",
        status: true,
        data: {
            balance: Number(availableBalance)
        }
    });
}

const getAdminbankdetails = async (req, res, next) => {
    try{
        const  defaultAdmin = await admin.findOne({})
        if(!defaultAdmin){
            return res.status(404).json({status:false,message:"admin not found"});
        }
        const defaultAdminbankDetails= await bankDetails.findOne({user_id:defaultAdmin._id})
        if(!defaultAdminbankDetails){
        return res.status(404).json({status:false,message:"Current No bank details added by Admin"});
        }
        return res.status(StatusCodes.OK).json({
            message: "Admin Bank Details Fetched Successfully",
            status: true,
            data: defaultAdminbankDetails
        });
    }catch(err){
        console.error(err);
        res.status(500).json({status:false, message:err.message});
    }
}

module.exports ={
    register,
    Login,
    logout,
    getUserProfile,
    updateUserProfile,
    joinContest,
    GetQuizeByQuizId,
    getQuizByUserId,
    Submit_Quiz,
    addFundRequest,
    addWithdrawRequest,
    availableBalance,
    getAdminbankdetails
}




// const <controllername> = async (req, res, next) => {
//     try{
        
//     }catch(err){
//         console.error(err);
//         res.status(500).json({status:false, message:err.message});
//     }
// }


// if(){
//     return res.status(404).json({status:false,message:""})
// }



