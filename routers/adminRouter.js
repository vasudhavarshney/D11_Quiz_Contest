//Import Intalled Libraries here 
const express = require("express");
const router = express.Router();
const { body,validationResult } = require('express-validator');


//Import Files here 
const { adminAuthMiddleware } = require("../middlewares/authentication");
const {
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
} = require("../Controllers/adminController.js");
const { walletTrasactionList } = require("../Controllers/commonController.js");


const validateContest = [
  body('title').notEmpty().withMessage('Title is required'),
  body('startTime').isISO8601().toDate().withMessage('Invalid start time format'),
  body('endTime').isISO8601().toDate().withMessage('Invalid end time format'),
  // body('questions').isArray({ min: 1 }).withMessage('At least one question is required'),
  body('questions.*.title').notEmpty().withMessage('Question title is required'),
  body('questions.*.options').isArray({ min: 2 }).withMessage('Each question must have at least two options'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, errors: errors.array() });
    }
    next();
}
];

const validateCreatePool = [
  body('contestId').exists().isMongoId().withMessage('Invalid contest ID'),
  body('entryFee').exists().isNumeric().withMessage('Entry fee must be a number'),
  body('maxUserCount').exists().isNumeric().withMessage('Max user count must be a number'),
  body('initialUserCount').exists().isNumeric().withMessage('Initial user count must be a number'),
  body('maxWinningAmount').exists().isNumeric().withMessage('Max winning amount must be a number'),
  // body('winningSlabs').exists().isArray({ min: 1 }).withMessage('At least one winning slab must be provided'),
  (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
          return res.status(400).json({ status: false, errors: errors.array() });
      }
      next();
  }
];


const validatePoolQuestion = [
  body('title').notEmpty().withMessage('Question title is required'),
  body('banner').notEmpty().withMessage('Question banner is required'),
  body('options').isArray({ min: 2 }).withMessage('Question must have at least two options'),
 (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
          return res.status(400).json({ status: false, errors: errors.array() });
      }
      next();
  }
];

const validateWithdrawAction = [
  body('status').notEmpty().withMessage('Status is required.'),
  body('withDrawReqId').notEmpty().withMessage('Withdrawal Request ID is required.'),
  body('remark').optional().isString().withMessage('Remark must be a string.'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: false, error: errors.array()[0].msg });
    }
    next();
  }]


///routes
router.post("/login", adminLogin);// Done
router.post("/logout", adminAuthMiddleware, logout);// Done
router.post("/createContest", adminAuthMiddleware,validateContest, createContest);// Done
router.post("/createPool", adminAuthMiddleware,validateCreatePool, createPool);// Done
router.post("/addQuestion/:contestId", adminAuthMiddleware,validatePoolQuestion, addQuestion);// Done
router.put("/createWinnningSlab/:pool_id", adminAuthMiddleware, createWinnningSlab);
router.get("/GetQuizListByPool/:pool_id", adminAuthMiddleware, GetQuizListByPool);
router.put("/updateAnsweredOptions/:contestId", adminAuthMiddleware, updateAnsweredOptions);
router.put("/RankByPool/:pool_id", adminAuthMiddleware, RankByPool);
router.put("/savePoolResult/:pool_id", adminAuthMiddleware, savePoolResult);
router.get("/adminDashboard", adminAuthMiddleware, adminDashboard);
router.get("/getAdminsettings", adminAuthMiddleware, getAdminsettings);
router.put("/UpdateAdminSettings", adminAuthMiddleware, UpdateAdminSettings);
router.post("/UploadGiftImage", adminAuthMiddleware, UploadGiftImage);
//wallet Operations routes
router.put('/take-fund-action', adminAuthMiddleware,actionOnFundRequest);
router.put('/take-withdraw-action', adminAuthMiddleware,validateWithdrawAction, actionOnWithdrawRequest)
router.route('/wallet-transactions').get(adminAuthMiddleware, walletTrasactionList);
router.get('/AdminWalletBalance', adminAuthMiddleware, fetcchAdminWallet)
router.put('/admin-load-Balance', adminAuthMiddleware, adminloadBalance)
router.put('/publishContestResult/:contestId', adminAuthMiddleware, publishContestResult)





module.exports = router;
