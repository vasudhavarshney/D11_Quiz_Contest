//Import Environment Variables
const dotenv = require('dotenv')
dotenv.config()

//Import Configured Files
const {
  calculateTotalWinningAmount,
  calculateTotalUserCount
} = require('../utilities/ContestUtility.js')

//Import Models
const Contest = require('../models/contestModel.js')
const Pool = require('../models/poolModel.js')
const quiz = require('../models/quizModel.js')
const FundRequest = require('../models/FundRequest.js');
const WithdrawRequest = require('../models/WithdrawRequest.js');
const WalletTransaction = require('../models/WalletTransaction.js');
const BankModel = require('../models/bankDetails.js')

//Import Installed Libaries here
const { StatusCodes } = require("http-status-codes");
const path = require("path");
const fs = require('fs');



const getContestlist = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const cookies = req.headers.cookie;
    const UserFilter = (req.query.userId)?{userId:req.query.userId}:{};
    const existingQuizesContestlist = await quiz.find(UserFilter).then(r=>{
      return r.map(e=>{
        return e.contestId
      })
    })//Continue
    console.log("existingQuizesContestlist---->",existingQuizesContestlist)
    const myconstestfilter=(req.query.userId)?{_id:{$nin:existingQuizesContestlist}}:{}
    const options = {
      page: page,
      limit: limit,
      
      projection: {
        _id: 1,
        title: 1,
        banner: 1,
        startTime: 1,
        endTime: 1,
        resultsDeclared: 1,
        pools: 1,
        createdAt: 1,
      },
      sort: {createdAt:-1 },
     
    }

    const contests = await Contest.paginate(myconstestfilter, options)

    const contestDataWithStats = await Promise.all(
      contests.docs.map(async contest => {
        try {
          const totalWinningAmount = await calculateTotalWinningAmount(contest)
          const totalUserCount = await calculateTotalUserCount(contest)
          return { ...contest.toJSON(), totalWinningAmount, totalUserCount }
        } catch (error) {
          console.error('Error processing contest:', error)
          return null
        }
      })
    )

    const baseUrl = `${req.protocol}://${req.get('host')}${
      req.originalUrl.split('?')[0]
    }`
    const userparams =(req.query.userId)?'&'+req.originalUrl.split('?')[1].split('&').find(param => param.includes('userId')):``
    const totalDocuments = contests.totalDocs
    const totalPage = contests.totalPages
    const nextPage = contests.nextPage
      ? `${baseUrl}?page=${contests.nextPage}&limit=${limit}${userparams}`
      : null
    const prevPage = contests.prevPage
      ? `${baseUrl}?page=${contests.prevPage}&limit=${limit}${userparams}`
      : null

    res.status(200).json({
      status: true,
      contests: contestDataWithStats,
      pagination: {
        totalDocuments: totalDocuments,
        totalPage: totalPage,
        page: page,
        limit: limit,
        nextPageLink: nextPage,
        prevPageLink: prevPage
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ status: false, message: err.message })
  }
}

const getPool = async (req, res, next) => {
  try {
    const { contestId } = req.params
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10

    const options = {
      page: page,
      limit: limit,
      populate:{
        path: 'contestId',
        select: '_id resultsDeclared'
    },
    sort :{
      createdAt:-1
    }
    }

    const pool = await Pool.paginate({ contestId }, options)
    const baseUrl = `${req.protocol}://${req.get('host')}${
      req.originalUrl.split('?')[0]
    }`
    const totalDocuments = pool.totalDocs
    const totalPage = pool.totalPages
    const nextPage = pool.nextPage
      ? `${baseUrl}?page=${pool.nextPage}&limit=${limit}`
      : null
    const prevPage = pool.prevPage
      ? `${baseUrl}?page=${pool.prevPage}&limit=${limit}`
      : null
    const pooldata = pool.docs
    const data = pooldata.map(obj => {
      const { initialUserCount, ActualUserCount, ...rest } = obj
      const userCount = Math.max(initialUserCount, ActualUserCount)
      delete rest._doc.initialUserCount
      delete rest._doc.ActualUserCount
      return { ...rest._doc, userCount }
    })

    res.status(200).json({
      status: true,
      pools: data,
      pagination: {
        totalDocuments: totalDocuments,
        totalPage: totalPage,
        page: page,
        limit: limit,
        nextPageLink: nextPage,
        prevPageLink: prevPage
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ status: false, message: err.message })
  }
}

const getQuestionsByContestId = async (req, res, next) => {
  try {
    const { ContestId } = req.params
    const contest = await Contest.findById(ContestId)
    if (!contest) {
      return res
        .status(404)
        .json({ status: false, message: 'contest not found' })
    }
    const questions = contest.questions
    res
      .status(200)
      .json({
        status: true,
        message: 'Quetions Fetched Sucessfully',
        questions
      })
  } catch (err) {
    console.error(err)
    res.status(500).json({ status: false, message: err.message })
  }
}

const getPoolByPoolId = async (req, res, next) => {
  try {
    const { PoolId } = req.params
    const pool = await Pool.findById(PoolId).select('-questions')

    if (!pool) {
      return res.status(404).json({ status: false, message: 'Pool not found' })
    }
    const data = [pool].map(obj => {
      const { initialUserCount, ActualUserCount, ...rest } = obj
      const userCount = Math.max(initialUserCount, ActualUserCount)
      delete rest._doc.initialUserCount
      delete rest._doc.ActualUserCount
      return { ...rest._doc, userCount }
    })
    res
      .status(200)
      .json({ status: true, message: 'Pool Detail Fetched', data: data[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ status: false, message: err.message })
  }
}

const fundRequests = async (req, res) => {
  // const user = req.user.userId;
  const { user_id,toDate, fromDate, status, numericFilters, sort, fields } = req.query;
  const queryObject = user_id?{ user_id: user }:{};

  if (['under_process', 'approved', 'rejected'].includes(String(status))) {
      queryObject.status = status;
  }

  let createdAt = {};
  if (fromDate) {
      createdAt.$gte = new Date(new Date(fromDate).setHours(00, 00, 00)).toISOString();
  }
  if (toDate) {
      createdAt.$lt = new Date(new Date(toDate).setHours(23, 59, 59)).toISOString();
  }
  if (fromDate || toDate) {
      queryObject.createdAt = createdAt;
  }

  if (numericFilters) {
      const operatorMap = {
          '>': '$gt',
          '>=': '$gte',
          '=': '$eq',
          '<': '$lt',
          '<=': '$lte',
      };
      const regEx = /\b(<|>|>=|=|<|<=)\b/g;
      let filters = numericFilters.replace(
          regEx,
          (match) => `-${operatorMap[match]}-`
      );
      const options = ['amount'];
      filters = filters.split(',').forEach((item) => {
          const [field, operator, value] = item.split('-');
          if (options.includes(field)) {
              queryObject[field] = { [operator]: Number(value) };
          }
      });
  }

  let result = FundRequest.find(queryObject);

  // Count total documents
  const totalDocuments = await FundRequest.countDocuments(queryObject);

  // Pagination
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  result = result.skip(skip).limit(limit);

  // Sort
  if (sort) {
      const sortList = sort.split(',').join(' ');
      result = result.sort(sortList);
  } else {
      result = result.sort({'createdAt':-1});
  }

  // Select fields
  if (fields) {
      const fieldsList = fields.split(',').join(' ');
      result = result.select(fieldsList);
  }

  // Executing the query
  const fundRequest = await result;

  // Calculate total pages
  const totalPages = Math.ceil(totalDocuments / limit);

  // Generate previous and next page links
  let prevPageLink = null;
  let nextPageLink = null;
  if (page > 1) {
      prevPageLink = `${process.env.BASE_URL}/api/v1/common/fund-requests?page=${page - 1}&limit=${limit}`;
  }
  if (page < totalPages) {
      nextPageLink = `${process.env.BASE_URL}/api/v1/common/fund-requests?page=${page + 1}&limit=${limit}`;
  }

  return res.status(StatusCodes.OK).json({ 
      message: "Fund Request List", 
      status: true, 
      data: fundRequest, 
      totalDocuments: totalDocuments, 
      page: page, 
      limit: limit, 
      totalPages: totalPages, 
      prevPageLink: prevPageLink, 
      nextPageLink: nextPageLink 
  });
}

const withDrawRequests = async (req, res) => {
  try {
      const { user_id, toDate, fromDate, status, numericFilters, sort, fields } = req.query;
      const queryObject = user_id ? { user_id } : {};

      if (['under_process', 'approved', 'rejected'].includes(String(status))) {
          queryObject.status = status;
      }

      let createdAt = {};
      if (fromDate) {
          createdAt.$gte = new Date(new Date(fromDate).setHours(00, 00, 00)).toISOString();
      }
      if (toDate) {
          createdAt.$lt = new Date(new Date(toDate).setHours(23, 59, 59)).toISOString();
      }
      if (fromDate || toDate) {
          queryObject.createdAt = createdAt;
      }

      if (numericFilters) {
          const operatorMap = {
              '>': '$gt',
              '>=': '$gte',
              '=': '$eq',
              '<': '$lt',
              '<=': '$lte',
          };
          const regEx = /\b(<|>|>=|=|<|<=)\b/g;
          let filters = numericFilters.replace(
              regEx,
              (match) => `-${operatorMap[match]}-`
          );
          const options = ['amount'];
          filters.split(',').forEach((item) => {
              const [field, operator, value] = item.split('-');
              if (options.includes(field)) {
                  queryObject[field] = { [operator]: Number(value) };
              }
          });
      }

      let result = WithdrawRequest.find(queryObject);

      if (sort) {
          const sortList = sort.split(',').join(' ');
          result = result.sort(sortList);
      } else {
          result = result.sort({'createdAt':-1});
      }

      if (fields) {
          const fieldsList = fields.split(',').join(' ');
          result = result.select(fieldsList);
      }

      const totalCount = await WithdrawRequest.countDocuments(queryObject);
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const totalPages = Math.ceil(totalCount / limit);
      const skip = (page - 1) * limit;

      result = result.skip(skip).limit(limit);
      const withdrawRequest = await result;

      const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;
      const nextPageLink = page < totalPages ? `${baseUrl}?page=${page + 1}&limit=${limit}` : null;
      const prevPageLink = page > 1 ? `${baseUrl}?page=${page - 1}&limit=${limit}` : null;

      return res.status(StatusCodes.OK).json({
          message: "Withdraw Request List",
          status: true,
          data: withdrawRequest,
          totalDocuments: totalCount,
          page,
          limit,
          totalPages,
          prevPageLink,
          nextPageLink
      });
  } catch (error) {
      console.error(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error", status: false });
  }
}

const walletTrasactionList = async (req, res) => {
    try {
        const user = req.user.userId;
        const role = req.user.role;
        const { amount_type, transaction_type, toDate, fromDate, is_withdrawable, numericFilters, sort, fields } = req.query;
        const queryObject = { user_id: user };

        if (is_withdrawable) {
            queryObject.is_withdrawable = is_withdrawable === 'true' ? true : false;
        }
        if (['cr', 'dr'].includes(String(amount_type))) {
            queryObject.amount_type = amount_type;
        }
        if (['fund_request', 'withdraw_request', 'winning_amount', 'referal', 'bonus', 'bet_amount'].includes(String(transaction_type))) {
            queryObject.transaction_type = transaction_type;
        }

        let createdAt = {};
        if (fromDate) {
            createdAt.$gte = new Date(new Date(fromDate).setHours(00, 00, 00)).toISOString();
        }
        if (toDate) {
            createdAt.$lt = new Date(new Date(toDate).setHours(23, 59, 59)).toISOString();
        }
        if (fromDate || toDate) {
            queryObject.createdAt = createdAt;
        }

        if (numericFilters) {
            const operatorMap = {
                '>': '$gt',
                '>=': '$gte',
                '=': '$eq',
                '<': '$lt',
                '<=': '$lte',
            };
            const regEx = /\b(<|>|>=|=|<|<=)\b/g;
            let filters = numericFilters.replace(
                regEx,
                (match) => `-${operatorMap[match]}-`
            );
            const options = ['amount', 'balance_before', 'balance_after'];
            filters.split(',').forEach((item) => {
                const [field, operator, value] = item.split('-');
                if (options.includes(field)) {
                    queryObject[field] = { [operator]: Number(value) };
                }
            });
        }

        let result = WalletTransaction.find(queryObject);
        const totalDocuments = await WalletTransaction.countDocuments(queryObject);

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        result = result.skip(skip).limit(limit);

        if (sort) {
            const sortList = sort.split(',').join(' ');
            result = result.sort(sortList);
        } else {
            result = result.sort({'createdAt':-1});
        }

        if (fields) {
            const fieldsList = fields.split(',').join(' ');
            result = result.select(fieldsList);
        }

        const transactions = await result;
        const totalPages = Math.ceil(totalDocuments / limit);
        
        // Create pagination links
        const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;
        const nextPageLink = page < totalPages ? `${baseUrl}?page=${page + 1}&limit=${limit}` : null;
        const prevPageLink = page > 1 ? `${baseUrl}?page=${page - 1}&limit=${limit}` : null;

        // Send response
        return res.status(StatusCodes.OK).json({
            message: "Transaction List",
            status: true,
            data: {
                transactions,
                pagination: {
                    totalDocuments,
                    page,
                    limit,
                    totalPages,
                    prevPageLink,
                    nextPageLink
                }
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error", status: false });
    }
}

const addBankDetails = async (req, res, next) => {
  try {
    const requestedPerson = req.user.userId;
    const requestedPersonRole = req.user.role;

    let { bank, ifsc_code, ac_no, ac_holder_name, is_default ,upi_id} = req.body;
    let fetchExistingBankDetails = null;
    if (is_default) {
      fetchExistingBankDetails = await BankModel.findOne({
        user_id: requestedPerson,
        is_default: true,
        is_active: true,
      });
    }
    console.log(fetchExistingBankDetails);
    if (fetchExistingBankDetails) {
      return res.status(404).json({
        status: false,
        error: "You Already Has A Default Account!..",
      });
    }
    const uploadImage = !req.files.qrImage
    ? req.files.undefined
    : req.files.qrImage;
    const fileName = new Date().getTime() + "_" + uploadImage.name;
    let db_imagePath = ''
    let imagePath = ''
    if(requestedPersonRole === 'admin'){
      imagePath = path.join(
        __dirname,
        "../public/uploads/admin/qrImage/" + `${fileName}`
      );
      db_imagePath = `/public/uploads/admin/qrImage/${fileName}`
    }else{
      imagePath = path.join(
        __dirname,
        "../public/uploads/user/qrImage/" + `${fileName}`
      );
      db_imagePath = `/public/uploads/user/qrImage/${fileName}`
    }
    
    await uploadImage.mv(imagePath);

    let saveBankDetails = await BankModel.create({
      user_id: requestedPerson,
      bank: bank,
      ifsc_code: ifsc_code,
      ac_no: ac_no,
      ac_holder_name: ac_holder_name,
      is_default: is_default,
      qrImage:db_imagePath,
      upi_id:upi_id
    });
    res
      .status(200)
      .json({ status: true, message: "Bank Details Saved SuccessFully!.." });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
}

const updateBankDetails = async (req, res, next) => {
  try {
      const { userId ,role} = req.user;
   
      const { bank, ifsc_code, ac_no, ac_holder_name, is_default, upi_id} = req.body;
      
      const existingBankDetails = await BankModel.findOne({ user_id: userId });
      if (!existingBankDetails) {
          return res.status(404).json({
              status: false,
              error: "Bank details not found for the user."
          });
      }
      let db_imagePath = ''
      let imagePath = ''
      if(req.files?.qrImage){
        const absolutePath = path.join(__dirname, '../', existingBankDetails.qrImage);
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            console.log(`Image deleted successfully: ${absolutePath}`);
        } else {
            console.log(`Image not found: ${absolutePath}`);
        }
        const uploadImage = !req.files.qrImage
        ? req.files.undefined
        : req.files.qrImage;
        const fileName = new Date().getTime() + "_" + uploadImage.name;

        if(role === 'admin'){
          imagePath = path.join(
            __dirname,
            "../public/uploads/admin/qrImage/" + `${fileName}`
          );
          db_imagePath = `/public/uploads/admin/qrImage/${fileName}`
        }else{
          imagePath = path.join(
            __dirname,
            "../public/uploads/user/qrImage/" + `${fileName}`
          );
          db_imagePath = `/public/uploads/user/qrImage/${fileName}`
        }
        
        await uploadImage.mv(imagePath);
        existingBankDetails.qrImage =db_imagePath;
      }
      existingBankDetails.bank = bank || existingBankDetails.bank;
      existingBankDetails.ifsc_code = ifsc_code || existingBankDetails.ifsc_code;
      existingBankDetails.ac_no = ac_no || existingBankDetails.ac_no;
      existingBankDetails.ac_holder_name = ac_holder_name || existingBankDetails.ac_holder_name;
      existingBankDetails.is_default = is_default || existingBankDetails.is_default;
      existingBankDetails.upi_id = upi_id || existingBankDetails.upi_id;      

      await existingBankDetails.save();

      res.status(200).json({ status: true, message: "Bank details updated successfully." });
  } catch (err) {
      console.error(err);
      res.status(500).json({ status: false, error: err.message });
  }
};

const deleteBankDetails = async (req, res, next) => {
  try {
      const { userId } = req.user;
      await BankModel.findOneAndDelete({ user_id: userId }).then(r=>{
        const absolutePath = path.join(__dirname, '../', r.qrImage);
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            console.log(`Image deleted successfully: ${absolutePath}`);
        } else {
            console.log(`Image not found: ${absolutePath}`);
        }
      });

      res.status(200).json({ status: true, message: "Bank details deleted successfully." });
  } catch (err) {
      console.error(err);
      res.status(500).json({ status: false, error: err.message });
  }
};

const getBankDetails = async (req, res, next) => {
  try {
      const { userId } = req.user;
      const bankDetails = await BankModel.findOne({ user_id: userId,is_active: true });
      if (!bankDetails) {
          return res.status(200).json({
              status: false,
              message: "Bank details not found",
              data:{}
          });
      }

      res.status(200).json({ status: true, message: "Bank details fetched successfully.", data: bankDetails });
  } catch (err) {
      console.error(err);
      res.status(500).json({ status: false, error: err.message });
  }
};


module.exports = {
  getContestlist,
  getPool,
  getQuestionsByContestId,
  getPoolByPoolId,
  fundRequests,
  withDrawRequests,
  walletTrasactionList,
  addBankDetails,
  updateBankDetails,
  deleteBankDetails,
  getBankDetails
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
//
