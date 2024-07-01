//Import Intalled Libraries here 
const express = require("express");
const router = express.Router();


//Import Files here 
const { adminAuthMiddleware } = require("../middlewares/authentication");
const {
  getContestlist,
  getPool,
  getQuestionsByContestId,
  getPoolByPoolId,
  fundRequests,
  withDrawRequests,
  addBankDetails,
  updateBankDetails,
  deleteBankDetails,
  getBankDetails
} = require("../Controllers/commonController.js");



///routes
router.get("/getContestlist", getContestlist);// Done
router.get("/getPool/:contestId", getPool);
router.get("/getQuestionsByContestId/:ContestId", getQuestionsByContestId);
router.get("/getPoolByPoolId/:PoolId", getPoolByPoolId);
router.route('/fund-requests').get(fundRequests);//Done
router.route('/withdraw-requests').get( withDrawRequests);
router.post("/addBankDetails",adminAuthMiddleware, addBankDetails);
router.put("/updateBankDetails", adminAuthMiddleware,updateBankDetails);
router.delete("/deleteBankDetails", adminAuthMiddleware,deleteBankDetails);
router.get("/getBankDetails", adminAuthMiddleware,getBankDetails);





module.exports = router;
