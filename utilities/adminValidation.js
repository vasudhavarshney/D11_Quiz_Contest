const adminModel = require("../models/adminModel.js");
const FundRequestModel = require("../models/FundRequest.js");
const withdrawRequestModel = require("../models/WithdrawRequest.js");
const FundRequest = require("../models/FundRequest.js");
const withdrawModel = require("../models/WithdrawRequest.js");
const bankModel = require("../models/bankDetails.js");
const path = require("path");
const { drTransaction, crTransaction } = require("./adminBalanceUtils");
const { drTransaction: user_drTransaction, crTransaction: user_crTransaction } = require("./userBalanceUtil.js");





async function validateActionOnWalletRequest(
  actionTakerPersonId,
  fundReqId,
  status,
  remarks
) {
  let actionTakerIdCheck = await adminModel.findOne({
    _id: actionTakerPersonId,
  });
  let FundReqIdCheck = await FundRequestModel.findOne({
    _id: fundReqId,
    status: "under_process",
  });
  if (!actionTakerIdCheck) {
    return {
      status: false,
      statusCode: 400,
      message: "Something Is Missing!..😔",
    };
  } else if (!FundReqIdCheck) {
    return {
      status: false,
      statusCode: 400,
      message: "Fund Request Is Not Found Or Action Is Already Taken!..😔",
    };
  } else if (status == "approved") {
    if (actionTakerIdCheck.wallet_balance < FundReqIdCheck.amount) {
      return {
        status: false,
        statusCode: 400,
        message: "Your Account Balance Is Low To Make This Transaction!..😔",
      };
    } else {
      return {
        status: true,
        actionTakerData: actionTakerIdCheck,
        fundRequestData: FundReqIdCheck,
      };
    }
  } else if (status == "rejected") {
    if (!remarks) {
      return {
        status: false,
        statusCode: 400,
        message: "Remarks Is Must In Case Of Reject!..😑",
      }
    }else{
      return {
        status: true,
        actionTakerData: actionTakerIdCheck,
        fundRequestData: FundReqIdCheck,
      };
    }
  } else {
    return {
      status: true,
      actionTakerData: actionTakerIdCheck,
      fundRequestData: FundReqIdCheck,
    };
  }
}

async function validateActionOnWithdrawRequest(
  actionTakerPersonId,
  withDrawReqId,
  status,
  remark
) {
  let checkActionTakerPerson = await adminModel.findOne({
    _id: actionTakerPersonId,
  });
  let checkWithdrawRequest = await withdrawRequestModel.findOne({
    _id: withDrawReqId,
    status: "under_process",
  });
  if (!checkActionTakerPerson || !checkWithdrawRequest) {
    return {
      status: false,
      statusCode: 400,
      message: "Somthing Is Missing!..😔",
    };
  } else if (actionTakerPersonId != checkWithdrawRequest.assignId) {
    return {
      status: false,
      statusCode: 400,
      message: "This Request Is Not Assign You!..😔",
    };
  } else if (status == "rejected") {
    if (!remark) {
      return {
        status: false,
        statusCode: 400,
        message: "In Case Of Reject Remark Is Compulsary!..😔",
      };
    } else {
      return {
        status: true,
        actionTakerData: checkActionTakerPerson,
        fundRequestData: checkWithdrawRequest,
      };
    }
  } else if (status == "approved") {
    return {
      status: true,
      actionTakerData: checkActionTakerPerson,
      fundRequestData: checkWithdrawRequest,
    };
  } else {
    return {
      status: false,
      statusCode: 400,
      message: "please Provide A Valid Status!..😔",
    };
  }
}

async function makeFundRequest(data, amount, req) {
  const uploadImage = req.files.image;
  const fileName = new Date().getTime() + "_" + uploadImage.name;

  const imagePath = path.join(
    __dirname,
    "../public/uploads/fund-requests/" + `${fileName}`
  );
  await uploadImage.mv(imagePath);
  const funrequest = await FundRequest.create({
    user_id: data._id,
    amount: amount,
    image: `public/uploads/fund-requests/${fileName}`,
    status: "under_process",
    assignId: data.created_by,
  }).then(async(sucess)=>{
    console.log(sucess)
    return {status: true};
  }).catch(err=>{
    return {status: false};
  });
   return funrequest
}
 

async function takeActionOnrequest(
  actionTakerData,
  fundRequestData,
  status,
  remark
) {
  if (status == "approved") {
    let doTransfer = await drTransaction(
      actionTakerData._id,
      fundRequestData.amount,
      "direct_debit",
      fundRequestData.user_id
    );
    let creditLimit = await user_crTransaction(
      fundRequestData.user_id,
      fundRequestData.amount,
      "wallet_Recharge",
    );
    let updateFundRequest = await FundRequest.updateOne(
      { _id: fundRequestData._id },
      {
        $set: {
          status: "approved",
          remarks:remark
        },
      }
    )
    return {
      status: true,
    };
  } else {
    let updateFundRequest = await FundRequest.updateOne(
      { _id: fundRequestData._id },
      {
        $set: {
          status: "rejected",
          remarks: remark,
        },
      }
    ).then(sucess=>{
      return sucess
    })
    return { "status": true };
  }
}

async function  makeWithDrawRequest(requestedUserData, amount) {
  let fetchBankDetails = await bankModel
    .findOne({
      user_id: requestedUserData._id,
      is_active: true,
      is_default: true,
    })
    .select("bank ifsc_code ac_no ac_holder_name");
  if (requestedUserData.wallet_balance < amount) {
    return {
      status: false,
      statusCode: 400,
      message: "Amount Is Higher!..😎",
    };
  } else if (!fetchBankDetails) {
    return {
      status: false,
      statusCode: 400,
      message: "Your Bank Details Are Not Valid!..😎",
    };
  } else {
    let debitLimitFromRequestedUser = await drTransaction(
      requestedUserData._id,
      amount,
      "withdraw_request",
      requestedUserData.created_by
    );
    const withdrawreq=await withdrawModel.create({
      user_id: requestedUserData._id,
      amount: amount,
      status: "under_process",
      bank_detail: fetchBankDetails,
      assignId: requestedUserData.created_by,
    }).then(async(sucess)=>{
      console.log(sucess)
     
      return {status: true};
    }).catch(err=>{
      return {status: false};
    });
    return withdrawreq
  }
}

async function takeActionOnWithdrawrequest(
  actionTakerData,
  fundRequestData,
  status,
  remark
) {
  if (status == 'rejected') { 
    let updateStatusOfWithdrawRequest = await withdrawModel.updateOne({_id: fundRequestData._id}, {$set: {status: 'rejected',remarks:remark}});
    let refundLimit = await user_crTransaction(fundRequestData.user_id, fundRequestData.amount, 'reject_withdraw', true);
    return {
      status: true
    }
  } else {
    let updateStatus = await withdrawModel.updateOne({_id: fundRequestData._id}, {$set: {status: 'approved',remarks:remark}}).then(sucess=>{
      // MakerequestNotification(fundRequestData._id,"Withdraw_Request",fundRequestData.user_id,"Request "+status+" : "+remark);
    });
    let creditLimit = await crTransaction(actionTakerData._id, fundRequestData.amount, 'approve_withdraw', fundRequestData.user_id );//added into admin wallet
    return {
      status: true
    }
  }
}

module.exports = {
  validateActionOnWalletRequest,
  validateActionOnWithdrawRequest,
  makeFundRequest,
  takeActionOnrequest,
  makeWithDrawRequest,
  takeActionOnWithdrawrequest
};
