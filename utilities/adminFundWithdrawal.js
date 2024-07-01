const FundRequest = require("../models/FundRequest");
const withdrawModel = require("../models/WithdrawRequest");
const NotificationSchema = require("../models/NotificationModel.js");
const bankModel = require("../models/bankDetails");
const path = require("path");
const { drTransaction, crTransaction } = require("./adminBalanceUtils");
const { fetchBankDetails } = require("../controllers/adminController");

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
    image: `uploads/fund-requests/${fileName}`,
    status: "under_process",
    assignId: data.created_by,
  }).then(async(sucess)=>{
    console.log(sucess)
    // MakerequestNotification(sucess._id,"Fund_Request",sucess.assignId,"Request Raised "+sucess.status+" : ");
    return {status: true};
  }).catch(err=>{
    return {status: false};
  });
   return funrequest
}
 
// async function MakerequestNotification(Req_id,Req_type,Req_assignId,Req_remark) {
//   await NotificationSchema.create({
//     request_id: Req_id ,
//     request_type:Req_type ,  //either Fund_Request or withdraw_request
//     assignId:Req_assignId,
//     remark:Req_remark
//   });

// }

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
      "limit_debit",
      fundRequestData.user_id
    );
    let creditLimit = await crTransaction(
      fundRequestData.user_id,
      fundRequestData.amount,
      "limit_credit",
      actionTakerData._id
    );
    let updateFundRequest = await FundRequest.updateOne(
      { _id: fundRequestData._id },
      {
        $set: {
          status: "approved",
        },
      }
    );
    return {
      status: true,
    };
  } else {
    let updateFundRequest = await FundRequest.updateOne(
      { _id: fundRequestData._id },
      {
        $set: {
          status: "rejected",
          remark: remark,
        },
      }
    ).then(sucess=>{
      // MakerequestNotification(fundRequestData._id,"Fund_Request",fundRequestData.user_id,"Request "+status+" : "+remark);
      return sucess
    })
    return { status: true };
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
      // MakerequestNotification(sucess._id,"Withdraw_Request",sucess.assignId,"Request Raised "+sucess.status+" : ");
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
    let updateStatusOfWithdrawRequest = await withdrawModel.updateOne({_id: fundRequestData._id}, {$set: {status: 'rejected'}});
    let refundLimit = await crTransaction(fundRequestData.user_id, fundRequestData.amount, 'reject_withdraw', actionTakerData._id);
    return {
      status: true
    }
  } else {
    let updateStatus = await withdrawModel.updateOne({_id: fundRequestData._id}, {$set: {status: 'approved'}}).then(sucess=>{
      // MakerequestNotification(fundRequestData._id,"Withdraw_Request",fundRequestData.user_id,"Request "+status+" : "+remark);
    });
    let creditLimit = await crTransaction(actionTakerData._id, fundRequestData.amount, 'approve_withdraw', fundRequestData.user_id);
    return {
      status: true
    }
  }
}

module.exports = {
  makeFundRequest,
  takeActionOnrequest,
  makeWithDrawRequest,
  takeActionOnWithdrawrequest,
  // MakerequestNotification
};
