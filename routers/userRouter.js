//Import Intalled Libraries here 
const express = require("express");
const router = express.Router();
const { body,validationResult } = require('express-validator');


//Import Files here 
const { authenticateUser } = require("../middlewares/authentication");
const {
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
} = require("../Controllers/userController");
const { walletTrasactionList } = require("../Controllers/commonController");

//Validators for different routes
const UserRegisterationsValidator =  [
    body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Invalid email'),
    body('mobile').trim().isMobilePhone('en-IN').withMessage('Invalid mobile number'),
    body('password').trim().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
          return res.status(400).json({ status: false, errors: errors.array() });
      }
      next();
  }
] 

const SubmitQuizValidator =  [
  body('answers').isArray({ min: 1 }).withMessage('Answer atleast 1 Quetion before submission'),
  body('answers.*.question_id').notEmpty().withMessage('question_id is required'),
  body('answers.*.answered_Option_id').notEmpty().withMessage('answered_Option_id is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: false, errors: errors.array() });
    }
    next();
}
]

///routes
router.post("/login", Login);// Done
router.post("/logout", authenticateUser, logout);// Done
router.post("/register", UserRegisterationsValidator, register);//Done
router.get("/getUserProfile", authenticateUser, getUserProfile);//Done
router.put("/updateUserProfile", authenticateUser, updateUserProfile);//Done
router.get("/joinContest/:contestId", authenticateUser, joinContest);//Done
router.get("/GetQuizeByQuizId/:QuizId", authenticateUser, GetQuizeByQuizId);//Done
router.get("/getQuizByUserId/:UserId", authenticateUser, getQuizByUserId);//Done
router.post("/Submit_Quiz/:QuizId", authenticateUser,SubmitQuizValidator, Submit_Quiz);//Done
router.get("/getAdminBankDetails", authenticateUser, getAdminbankdetails);//Done

//wallet Operations 
router.route('/wallet-transactions').get(authenticateUser, walletTrasactionList);
router.route('/add-fund-request').post(authenticateUser, addFundRequest);//Done
router.route('/add-withdraw-request').post(authenticateUser, addWithdrawRequest);
router.route('/wallet-balance').get(authenticateUser, availableBalance);




// QuizId UserId

module.exports = router;
