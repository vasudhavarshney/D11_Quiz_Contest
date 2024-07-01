//Import Environment Variables
const dotenv = require("dotenv");
dotenv.config();

//Import Configured Files
const {
  crTransaction,
  drTransaction,
} = require("../utilities/adminBalanceUtils.js");
const { attachCookiesToResponse, createToken } = require("../utilities/jwt.js");
const {
  generateUID,
  quizScore,
  getContestTotalScore,
  calculateTotalWinningAmount,
  targetedSlabs,
  PoolRankAvailability,
  processContestResultTransactions,
} = require("../utilities/ContestUtility.js");
const {
  validateActionOnWalletRequest,
  validateActionOnWithdrawRequest,
  takeActionOnrequest,
  takeActionOnWithdrawrequest,
} = require("../utilities/adminValidation.js");

//Import Models
const adminModel = require("../models/adminModel.js");
const adminSetting  = require('../models/adminSetting.js');
const Token = require("../models/TokenSchema.js");
const Contest = require("../models/contestModel.js");
const Pool = require("../models/poolModel.js");
const quiz = require("../models/quizModel.js");
const fundRequest = require("../models/FundRequest.js");
const withdraw_request = require("../models/WithdrawRequest.js");
const WalletTransaction = require("../models/WalletTransaction.js");

//Import Installed Libaries here
const _ = require("lodash");
const path=  require("path");
const { StatusCodes } = require("http-status-codes");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const UserModel = require("../models/UserModel.js");

const adminLogin = async (req, res) => {
  const { loginId, password } = req.body;

  let formErrors = {};
  switch (true) {
    case !loginId:
      formErrors.loginId = "loginId is required.";
      break;
  }
  switch (true) {
    case !password:
      formErrors.password = "Password is required.";
      break;
  }

  if (!_.isEmpty(formErrors)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Validation Error occurs.",
      formErrors: formErrors,
      status: false,
    });
  }

  const admin = await adminModel.findOne({ loginId: loginId });
  if (!admin) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Validation Error occurs.",
      formErrors: { loginId: "Credential does not exit." + loginId },
      status: false,
    });
  }
  console.log(
    "password, admin.password------------>",
    password,
    admin.password
  );
  const isPasswordCorrect = await bcrypt.compare(password, admin.password);
  if (!isPasswordCorrect) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "loginId Or Password Is Not Correct",
      status: false,
    });
  }

  const tokenUser = createToken(admin);

  // create refresh token
  let refreshToken = "";
  // check for existing token
  const existingToken = await Token.findOne({ user: admin._id });

  if (existingToken) {
    const { isValid } = existingToken;
    if (!isValid) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Validation Error occurs.",
        formErrors: { password: "Password does not exit." },
        status: false,
      });
    }
    refreshToken = existingToken.refreshToken;
    const { refreshTokenJWT, accessTokenJWT } = attachCookiesToResponse({
      res,
      user: tokenUser,
      refreshToken,
    });
    //access_token: accessTokenJWT, referesh_token: refreshTokenJWT
    res.status(StatusCodes.OK).json({
      user: tokenUser,
      access_token: accessTokenJWT,
      referesh_token: refreshTokenJWT,
      status: true,
      message: "Auth Success",
    });
    return;
  }

  refreshToken = crypto.randomBytes(40).toString("hex");
  const userAgent = req.headers["user-agent"];
  const ip = req.ip;
  const userToken = { refreshToken, ip, userAgent, user: admin._id };

  await Token.create(userToken);

  const { refreshTokenJWT, accessTokenJWT } = attachCookiesToResponse({
    res,
    user: tokenUser,
    refreshToken,
  });
  // access_token: accessTokenJWT, referesh_token: refreshTokenJWT
  return res.status(StatusCodes.OK).json({
    user: tokenUser,
    access_token: accessTokenJWT,
    referesh_token: refreshTokenJWT,
    status: true,
    message: "Auth Success",
  });
};

const logout = async (req, res) => {
  await Token.findOneAndDelete({ user: req.user.userId });

  res.cookie("accessToken", "logout", {
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  res.cookie("refreshToken", "logout", {
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  res
    .status(StatusCodes.OK)
    .json({ message: "user logged out!", status: true });
};

const createContest = async (req, res, next) => {
  try {
    const {
      title,
      banner,
      startTime,
      endTime,
      resultsDeclared,
      questions,
      pools,
    } = req.body;
    const uploadImage = !req.files.image
      ? req.files.undefined
      : req.files.image;
    const fileName = new Date().getTime() + "_" + uploadImage.name;

    let imagePath = path.join(
      __dirname,
      "../public/uploads/banner/contest/" + `${fileName}`
    );
    await uploadImage.mv(imagePath);
    imagePath = process.env.BASE_URL + "uploads/banner/contest/" + `${fileName}`;
    const newContest = new Contest({
      title,
      banner: `public/uploads/banner/contest/${fileName}`,
      startTime, //"2024-04-25T08:00:00Z"
      endTime, //"2024-04-25T10:00:00Z"
      questions,
      resultsDeclared,
      pools,
    });

    const savedContest = await newContest.save();

    res.status(201).json({ status: true, contest: savedContest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: err.message });
  }
};

const createPool = async (req, res, next) => {
  try {
    const {
      contestId,
      entryFee,
      banner,
      maxUserCount,
      initialUserCount,
      maxWinningAmount,
      winningSlabs,
    } = req.body;

    const contestDetail = await Contest.findOne({ _id: contestId }).then(
      (r) => {
        if (!r) {
          res.status(404).json({
            status: false,
            message: "Invalid Contest Id:Contest not Found",
          });
        } else {
          return r;
        }
      }
    );
    const uploadImage = !req.files.image
      ? req.files.undefined
      : req.files.image;
    const fileName = new Date().getTime() + "_" + uploadImage.name;

    let imagePath = path.join(
      __dirname,
      "../public/uploads/banner/pool/" + `${fileName}`
    );
    await uploadImage.mv(imagePath);
    imagePath = process.env.BASE_URL + "uploads/banner/pool/" + `${fileName}`;
    const newPool = new Pool({
      contestId,
      entryFee,
      banner: `public/uploads/banner/pool/${fileName}`,
      maxUserCount,
      initialUserCount,
      maxWinningAmount,
      winningSlabs,
    });

    const savedPool = await newPool.save();
    contestDetail.pools.push(savedPool._id);
    await contestDetail.save();
    res.status(201).json({
      status: true,
      message: "Pool created successfully",
      pool: savedPool,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: err.message });
  }
};

///under Development mode
// const process_winningSlabs=(arr)=>{
//   const tem = []
//   arr.forEach(e=>{
//       if(typeof e.rank === "string"){
//           let [min, max] = e.rank.split('-');
//           for(let i =Number(min);i<=Number(max);i++){
//               if(e.reward_Type === "Gift"){
//                   tem.push({
//                       "rank": i,
//                       "winnerCount": e.winnerCount,
//                       "allTaken": e.allTaken,
//                       "reward_Type": e.reward_Type,
//                       "giftName":e.giftName,
//                       "giftImagePath":e.giftImagePath
//                   }) 
//               }else{
//                    tem.push({
//                       "rank": i,
//                       "winnerCount": e.winnerCount,
//                       "allTaken": e.allTaken,
//                       "reward_Type": e.reward_Type,
//                       "winningAmount": e.winningAmount
//                    })
//               }
             
//           }
//       }else{
//          tem.push(e)
//       }
//   })
//   return tem 
// }


const createWinnningSlab = async (req, res) => {
  try {
    const { winningSlabs } = req.body;
    // const formattedslabs= process_winningSlabs(winningSlabs)
    // console.log("formattedslabs--------->",formattedslabs)
    const pool = await Pool.findOneAndUpdate(
      { _id: req.params.pool_id },
      { $set: { winningSlabs } },
      { new: true }
    );

    if (!pool) {
      return res.status(404).json({ status: false, message: "Pool not found" });
    }
    res.json({ status: true, message: "Winning slabs updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: err.message });
  }
};


///under Development mode

const addQuestion = async (req, res, next) => {
  try {
    const { title, banner,Weight, options } = req.body;
    if (!title || !options || !Array.isArray(options) || options.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Invalid request. Title and options are required.",
      });
    }

    const { contestId } = req.params;
    const contest = await Contest.findById(contestId);

    if (!contest) {
      return res
        .status(404)
        .json({ status: false, message: "Contest not found" });
    }
    if (contest.startTime < Date.now()) {
      return res.status(404).json({
        status: false,
        message: "You cannot add new questions once the contest has begun",
      });
    }
    const newQuestion = {
      title,
      banner,
      Weight,
      options,
    };

    contest.questions.push(newQuestion);
    console.log("contest.questions.length--->", contest.questions.length);
    const quetion_count = contest.questions.length;
    await quiz.updateMany(
      { contestId: contest._id },
      { $set: { total_Points: quetion_count } }
    );
    await contest.save();

    res.status(201).json({
      status: true,
      message: "Question added successfully.",
      question: newQuestion,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: err.message });
  }
};

const GetQuizListByPool = async (req, res, next) => {
  try {
    const { pool_id } = req.params;
    const pool = await Pool.findById(pool_id);

    if (!pool) {
      return res.status(404).json({ status: false, message: "Pool not found" });
    }
    const Total_quiz_Score = await getContestTotalScore(pool.contestId);
    await quiz.updateMany(
      { contestId: pool.contestId },
      { $set: { total_Points: Total_quiz_Score } }
    );
    const Quizdocs = await quiz.find({ contestId: pool.contestId });
    await Promise.all(
      Quizdocs.map(async (q) => {
        try {
          const QuizScore = await quizScore(q._id);
          console.log("QuizScore---------->",QuizScore)
          await quiz.updateMany(
            { _id: q._id },
            { $set: { earned_points: QuizScore } }
          );
        } catch (error) {
          console.error("Error processing contest:", error);
          return null;
        }
      })
    );
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const options = {
      page: page,
      limit: limit,
      sort: { earned_points: -1, createdAt: -1 },
      projection: {
        _id: 1,
        userId: 1,
        poolId: 1,
        contestId: 1,
        submitted: 1,
        earned_points: 1,
        createdAt: 1,
        updatedAt: 1,
        total_Points: 1,
        rank: 1,
        winning_amount: 1,
        giftName:1,
        giftImagePath:1
      },
      populate: {
        path: "userId",
        select: "_id name",
      },
    };

    const Quiz = await quiz.paginate(
      { poolId: pool_id, submitted: true },
      options
    );

    const baseUrl = `${req.protocol}://${req.get("host")}${
      req.originalUrl.split("?")[0]
    }`;
    const totalDocuments = Quiz.totalDocs;
    const totalPage = Quiz.totalPages;
    const nextPage = Quiz.nextPage
      ? `${baseUrl}?page=${Quiz.nextPage}&limit=${limit}`
      : null;
    const prevPage = Quiz.prevPage
      ? `${baseUrl}?page=${Quiz.prevPage}&limit=${limit}`
      : null;

    res.status(200).json({
      status: true,
      Quizzes: Quiz.docs,
      pagination: {
        totalDocuments: totalDocuments,
        totalPage: totalPage,
        page: page,
        limit: limit,
        nextPageLink: nextPage,
        prevPageLink: prevPage,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: err.message });
  }
};

const updateAnsweredOptions = async (req, res) => {
  try {
    const { answeredOptions } = req.body;
    const { contestId } = req.params;

    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res
        .status(404)
        .json({ status: false, message: "Contest not found" });
    }
    // Update the answered options for each question
    answeredOptions.forEach(({ question_id, answered_Option_id }) => {
      const question = contest.questions.find((q) => q._id.equals(question_id));
      if (question) {
        //mark old answers as false
        const old_option = question.options.find((o) => o.marked);
        if (old_option) {
          old_option.marked = false; // Update the marked  Old field
        }
        const option = question.options.find((o) =>
          o._id.equals(answered_Option_id)
        );
        if (option) {
          option.marked = true; // Update the marked field to indicate the answered option
        }
      }
      return question;
    });
    await contest.save();
    res
      .status(200)
      .json({ status: true, message: "Answered options updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: err.message });
  }
};

///under Development mode
const RankByPool = async (req, res) => {
  try {
    const { pool_id } = req.params;
    const { userId, rank } = req.body;
    //validate rank availability by pool
    const{ t_slab, rankValues} =await targetedSlabs(rank, pool_id)
    console.log("t_slab:::::::::::::::::",t_slab)
    const isAvailable = await PoolRankAvailability(rank, pool_id);
    if (!isAvailable) {
      return res.status(404).json({
        status: false,
        message:
          "Rank Not Available: Winner Count for this rank have been exceeded",
      });
    }
    const targeted_Quiz = await quiz.findOne({
      userId: userId,
      poolId: pool_id,
    });
    if (!targeted_Quiz) {
      res.status(404).json({ status: false, message: "Unable to set rank" });
    }
    targeted_Quiz.rank = rank;
    targeted_Quiz.rankSlab =t_slab;
    await targeted_Quiz.save();
    return res
      .status(200)
      .json({ status: true, message: "Rank Assigned Sucessfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: err.message });
  }
};
///under Development mode


const actionOnFundRequest = async (req, res) => {
  try {
    const actionTakerPersonId = req.user.userId;
    const { fundReqId, status, remark } = req.body;
    const validateReq = await validateActionOnWalletRequest(
      actionTakerPersonId,
      fundReqId,
      status,
      remark
    );
    console.log(validateReq, "validateReq: " + JSON.stringify(validateReq));
    if (validateReq.status == false) {
      return res
        .status(validateReq.statusCode)
        .json({ status: validateReq.status, error: validateReq.message });
    }

    const takeAction = await takeActionOnrequest(
      validateReq.actionTakerData,
      validateReq.fundRequestData,
      status,
      remark
    );
    return res.status(200).json({
      status: true,
      message: "Status Changed SucessFully!..🤗",
    });
  } catch (e) {
    res.status(500).json({ status: false, error: e.message });
  }
};

const actionOnWithdrawRequest = async (req, res) => {
  try {
    const actionTakerPersonId = req.user.userId;
    const { withDrawReqId, status, remark } = req.body;
    const validateReq = await validateActionOnWithdrawRequest(
      actionTakerPersonId,
      withDrawReqId,
      status,
      remark
    );
    if (validateReq.status == false) {
      return res
        .status(validateReq.statusCode)
        .json({ status: validateReq.status, error: validateReq.message });
    }
    console.log(validateReq, "validateReq: " + validateReq);
    const takeAction = await takeActionOnWithdrawrequest(
      validateReq.actionTakerData,
      validateReq.fundRequestData,
      status,
      remark
    );
    return res.status(200).json({
      status: true,
      message: "Status Changed SucessFully!..🤗",
    });
  } catch (e) {
    res.status(500).json({ status: false, error: e.message });
  }
};

const fetcchAdminWallet = async (req, res) => {
  try {
    const user = req.user.userId;
    const checkvalid = await adminModel.findOne({
      _id: user,
    });
    console.log("checkvalid---------------->", user, checkvalid);
    if (!checkvalid) {
      return res.status(404).json({
        status: false,
        message: "Something went wrong not able to fetch admin wallet balance",
      });
    } else {
      return res.status(200).json({
        status: true,
        message: "Admin Wallet Balance fetched successfully!",
        walletBalance: checkvalid.wallet_balance,
      });
    }
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
};

const adminloadBalance = async (req, res, next) => {
  try {
    const user = req.user.userId;
    const { amount } = req.body || 0;

    await crTransaction(user, amount, "direct_credit");

    res
      .status(200)
      .json({ status: true, message: "Admin wallet updated Sucessfully " });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: err.message });
  }
};

const publishContestResult = async (req, res, next) => {
  try {
    const { contestId } = req.params;

    // Contest details for Updating ResultDeclared
    const contestDetails = await Contest.findOne({ _id: contestId });
    //Check the admin Wallect Balance in Sufficients or not
    const calculate_Total_WinningAmount = await calculateTotalWinningAmount(
      contestDetails
    );
    if(contestDetails.resultsDeclared){
      return res.status(404).json({
        status: false,
        message:
          "The contest results have already been published!",
      });
    }
    const defaultAdmin = await adminModel.findOne({});
    if (defaultAdmin.wallet_balance < calculate_Total_WinningAmount) {
      return res.status(404).json({
        status: false,
        message:
          "Unable to Publish Contest Result: Insufficient Admin wallet Balance",
      });
    }
    //check all the pool rank decleared
    const undeclared_pool_count = await Pool.countDocuments({
      contestId: contestId,
      Rank_Declare_Complete: false,
    });
    if (undeclared_pool_count > 0) {
      return res.status(404).json({
        status: false,
        message:
          "Unable to Publish Contest Result: Rank declaration is remaining for some Pools!",
      });
    }

    //perform all Quiz winning ammount transactions
    const isTransactionCompleted = await processContestResultTransactions(
      contestId
    );

    //mark decleared result as true
    if (isTransactionCompleted) {
      contestDetails.resultsDeclared = true;
      await contestDetails.save();
      res.status(200).json({
        status: true,
        message: "Contest Result Published Successfully",
      });
    } else {
      //for rare cases Only need to handle it later on
      //possibly this will happened in case of Insufficient funds admin wallet balance
      //handeling  Insufficient funds admin wallet balance it through validation
      res.status(200).json({
        status: true,
        message: "Contest Result Published Successfully",
        IncompleteTransactionsPoolList: isTransactionCompleted,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: err.message });
  }
};

const savePoolResult = async (req, res, next) => {
  try {
    const { pool_id } = req.params;
    const poolDetails = await Pool.findOne({ _id: pool_id });
    if (!poolDetails) {
      return res
        .status(404)
        .json({ status: false, message: "Invalid pool Id" });
    }
    poolDetails.Rank_Declare_Complete = true;
    await poolDetails.save();
    res.status(200).json({
      status: true,
      message: "Pool Rank Declaration Completed Sucessfully ",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: err.message });
  }
};

const adminDashboard = async (req, res, next) => {
    try{
      const today = new Date().toISOString().split('T')[0];
      const current_month = new Date().getMonth() + 1;
      const current_year = new Date().getFullYear();
      const MonthstartDate = new Date(current_year, current_month-1, 2).toISOString().split('T')[0];
      const MonthendDate = new Date(current_year, current_month, 1).toISOString().split('T')[0];
      console.log(MonthstartDate,MonthendDate);


      //contest management
      const TotalContest=await Contest.countDocuments({}) || 0;
      const CommingContest=await Contest.countDocuments({startTime:{$gt:today}}) || 0;
      const TotalLiveContest=await Contest.countDocuments({$and:[{startTime:{$lt:today}},{endTime:{$gt:today}},{resultsDeclared:false}]}) || 0;
      const TotalClosedContest=await Contest.countDocuments({$and:[{resultsDeclared:true}]})|| 0;
      
      //User management
      const TotalUsers=await UserModel.countDocuments({})|| 0;
      const TodayRegisteredUserCount=await UserModel.countDocuments({createdAt:{$eq:today}})|| 0;
      const MonthlyRegisteredUserCount=await UserModel.countDocuments({$and:[{createdAt:{$gte:MonthstartDate}},{createdAt:{$lte:MonthendDate}}]})|| 0;

      //financial Reports// fundRequest,withdraw_request
      const TotalWinningAmount=await WalletTransaction.aggregate([
        {
          $match: {
            transaction_type: "winning_amount",
          },
        },
        {
          $group: {
            _id: 0,
            totalWinningAmount: {
              $sum: "$amount",
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalWinningAmount: 1,
          },
        },
      ]).then(r=>{return r[0].totalWinningAmount}) || 0
      const TotalWithdrawal=await withdraw_request.aggregate([
        {
          $match: {
            status: "approved",
          },
        },
        {
          $group: {
            _id: 0,
            "totalWithdrawalAmount": {
              $sum: "$amount",
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalWithdrawalAmount: 1,
          },
        },
      ]).then(r=>{return r[0]?.totalWithdrawalAmount})|| 0
      const TotalFundrequest=await fundRequest.countDocuments({status:"under_process"})|| 0;
      const TotalWithdrawalrequest=await withdraw_request.countDocuments({status:"under_process"})|| 0;

      const Data = {
        "contest":{
          TotalContest,
          CommingContest,
          TotalLiveContest,
          TotalClosedContest
        },
        "Users":{
          TotalUsers,
          TodayRegisteredUserCount,
          MonthlyRegisteredUserCount
        },
        "Financial_Reports":{
          TotalWinningAmount,
          TotalWithdrawal,
          TotalFundrequest,
          TotalWithdrawalrequest,
        }
      }
      res.status(200).json({ success: true, message: 'Dashboard Count Fetched Sucessfully', Data:Data });
    }catch(err){
        console.error(err);
        res.status(500).json({status:false, message:err.message});
    }
}


const getAdminsettings =async(req, res) => {
  try{
    const settingsData = await adminSetting.find()
    res.status(200).json({ success: true, message: 'settings fetched Sucessfully',data:settingsData });
  }catch(err){
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal Server Error '+err.message  });    
  }

}

const UpdateAdminSettings =async(req, res) => {
  try{
    const key_name = req.body.key
    const max_Value = req.body.maxValue;
    const min_Value = req.body.minValue || 0;
    if(key_name==="WalletRecharge" || 
       key_name==="withdrawLimit" ||
       key_name==="Referrer_Reward_Amount" ||
       key_name==="Referee_Reward_Amount" ||
       key_name==="User_Referral_Limit"){
      await adminSetting.findOneAndUpdate({name:key_name},{$set:{minValue:min_Value, maxValue:max_Value}},{upsert:true}).then(r=>{
        res.status(201).json({ success: true, message: 'settings Updated Sucessfully' });
      });
    }else{
      return res.status(400).json({ success: false, message: 'key name is invalid Please use a valid key name ' }); 
    }
    
  }catch(err){
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal Server Error '+err.message });    
  }

}

const UploadGiftImage = async (req, res, next) => {
    try{
      const uniqueId = generateUID()
      console.log('Upload------------->',uniqueId)
      const uploadImage = !req.files.image
      ? req.files.undefined
      : req.files.image;
      const fileName = uniqueId + "_" + uploadImage?.name;

    let imagePath = path.join(
      __dirname,
      "../public/uploads/giftImages/" + `${fileName}`
    );
    await uploadImage.mv(imagePath);
    imagePath = "/public/uploads/giftImages/" + `${fileName}`;
    res.status(200).json({ 
      success: true,
      message: 'Image Uploaded Sucessfully',
      ImagePath:imagePath
     });

    }catch(err){
        console.error(err);
        res.status(500).json({status:false, message:err.message});
    }
}

module.exports = {
  adminLogin,
  logout,
  createContest,
  createPool,
  createWinnningSlab,
  addQuestion,
  GetQuizListByPool,
  updateAnsweredOptions,
  RankByPool,
  actionOnFundRequest,
  actionOnWithdrawRequest,
  fetcchAdminWallet,
  adminloadBalance,
  publishContestResult,
  savePoolResult,
  adminDashboard,
  UpdateAdminSettings,
  getAdminsettings,
  UploadGiftImage
};

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
