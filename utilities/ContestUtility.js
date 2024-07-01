//Import Configured Files
const { crTransaction,drTransaction } =require('../utilities/userBalanceUtil.js');
const { drTransaction: admin_drTransaction, crTransaction: admin_crTransaction } = require("../utilities/adminBalanceUtils.js");




//Import Installed Libaries here 

//Import Environment Variables
const dotenv = require('dotenv');
dotenv.config();
  


//Import Models
const Contest = require('../models/contestModel.js');
const Pool = require('../models/poolModel.js');
const quiz = require('../models/quizModel.js');
const admin = require('../models/adminModel.js');



function generateUID() {
    var firstPart = (Math.random() * 46656) | 0;
    var secondPart = (Math.random() * 46656) | 0;
    firstPart = ("000" + firstPart.toString(36)).slice(-3);
    secondPart = ("000" + secondPart.toString(36)).slice(-3);
    return firstPart + secondPart;
}

const getContestTotalScore= async (contestId) => {
    const contest = await Contest.findOne({ _id: contestId });
    if (!contest) {
        return false;
    }
    return contest.questions.reduce((sum, item) => sum + item.Weight, 0);
};

const isAnyUnanswered =(answers)=>{
    try{
        const doMatched =  answers.filter(e=>e.answered_Option_id===null)
        if(doMatched.length>0){
            return true
        }
        return false
    }catch(e){
        console.log(e);
        return false;
    }
}

//fetch the  Updated  answers from the contest in a array form like [{"question_id":"ghadgajhdhjdgah","answered_Option_id":"jhgjhdjhdbcjhacbd"}]
const getContestAnswerSheet = async (contestId) => {
    try {
        // Query the Contest model to fetch the updated answers
        const contest = await Contest.findById({_id:contestId}).select('questions');
        if (!contest) {
            throw new Error('Contest not found');
        }
        // Extract and format the answers from the contest
        const answers = contest.questions.map(question => ({
            question_id: question._id,
            Weight:question.Weight,
            answered_Option_id: question.options.find(option => option.marked)?._id || null
        }));
        const Any_Unanswered = isAnyUnanswered(answers);
        if (Any_Unanswered) {
            throw new Error('Some Question are answered in this Contest');
        }
        return answers;
    } catch (error) {
        console.error('Error fetching contest answer sheet:', error);
        return error;
    }
};

const calculateScore = (quizDetails, contestAnswerSheet) => {
    let score = 0;
    quizDetails.answers.forEach(quizAnswer => {
        const contestAnswer = contestAnswerSheet.find(answer => answer.question_id.equals(quizAnswer.question_id));
        if (contestAnswer && contestAnswer.answered_Option_id.equals(quizAnswer.answered_Option_id)) {
           score=score+contestAnswer.Weight;
            
        }
    });
    return score;
};

const quizScore = async (quizId) => {
    try {
        const quizDetails = await quiz.findById(quizId);
        const contestAnswerSheet = await getContestAnswerSheet(quizDetails.contestId);
        const anyUnanswered = isAnyUnanswered(contestAnswerSheet);
        if (anyUnanswered) {
            throw new Error('Some questions are unanswered in this quiz');
        }
        const score = calculateScore(quizDetails, contestAnswerSheet);
        return score;
    } catch (error) {
        console.error('Error calculating quiz score:', error);
        throw error;
    }
};

const calculateTotalWinningAmount = async (contest) => {
    let totalWinningAmount = 0;
    for (const poolId of contest.pools) {
        const pool = await Pool.findById(poolId);
        if (pool) {
            totalWinningAmount += pool.maxWinningAmount;
        }
    }
    return totalWinningAmount;
};

const calculateTotalUserCount = async (contest) => {
    let totalUserCount = 0;
    for (const poolId of contest.pools) {
        const pool = await Pool.findById(poolId);
        if (pool) {
            totalUserCount += Math.max(pool.initialUserCount, pool.ActualUserCount);
        }
    }
    return totalUserCount;
};

const targetedSlabs = async (rank, poolId) => {
    const pool = await Pool.findById(poolId);
    let t_slab;
    let rankValues;

    for (const slab of pool.winningSlabs) {
        console.log("slab.rank-------------->", slab.rank);
        const isRange = slab.rank.includes('-');
        console.log("isRange-------------->", isRange);

        if (isRange) {
            const [min, max] = slab.rank.split('-').map(Number);

            if (rank >= min && rank <= max) {
                t_slab = slab.rank;
                rankValues = Array.from({ length: max - min + 1 }, (_, i) => min + i);
                console.log("t_slab2-------------->", t_slab, rankValues);
                return { t_slab, rankValues };
            }
        } else {
            if (Number(slab.rank) === rank) {
                t_slab = slab.rank;
                rankValues = [Number(slab.rank)];
                console.log("t_slab1-------------->", t_slab, rankValues);
                return { t_slab, rankValues };
            }
        }

        console.log("t_slab3-------------->", t_slab, rankValues);
    }

    // If no matching slab is found, return a default value or throw an error
    return { t_slab: rank, rankValues: [rank] };
};


const PoolRankAvailability =async(rank,pool_id)=>{
    const {t_slab,rankValues} = await targetedSlabs(rank,pool_id)
    const quizeCountBypool = await quiz.countDocuments({poolId:pool_id, rank:{$in:rankValues}});
    const pooldetails= await Pool.findOne({_id:pool_id});
    const poolWinningSlab = await Pool.findOne({_id:pool_id},{
        "targetSlab": {
          "$filter": {
            "input": "$winningSlabs",
            "as": "slab",
            "cond": { "$eq": ["$$slab.rank", t_slab] }
          }
        }
      }).then(r=>{return {...r._doc}});
      console.log("poolWinningSlab.targetSlab-->",poolWinningSlab.targetSlab)
    if(quizeCountBypool>=poolWinningSlab.targetSlab[0]?.winnerCount){
        pooldetails.winningSlabs=pooldetails.winningSlabs.map(e=>{
            if(e.rank === Number(rank)){
                e.allTaken = true; 
            }
            return e
        })
        await pooldetails.save();
        return false;
    }
    return true;
}

const processPoolResultTransactions =async(poolId)=>{
    try{
        const Ranked_Quizzes=await quiz.find({poolId:poolId,rank:{$ne:null}})
        const defaultAdmin= await admin.findOne({})
        await Promise.all(Ranked_Quizzes.forEach(async(Quiz) => {
        
            //debit from admin Account 
            await admin_drTransaction(defaultAdmin._id,Quiz.winning_amount,"direct_debit")
            //credit to  Users Account 
            await crTransaction(Quiz.userId,Quiz.winning_amount,"winning_amount")
        }))

    }catch(e){
        console.log(e);
        return poolId;
    }
}

const processContestResultTransactions =async(contestId)=>{
   const ContestPoolList = await Contest.findOne({_id:contestId}).then(r => {return r.pools});
   console.log("ContestPoolList----------->",ContestPoolList);
   const result = await Promise.all(
        ContestPoolList.map(pool => {
            return processPoolResultTransactions(pool)
        })
    )
    // console.log("result------------------>",result,result.length)
    if(result.length>0){
        return result 
    }
    return true 
}


module.exports={
    generateUID,
    quizScore,
    getContestAnswerSheet,
    getContestTotalScore,
    calculateTotalWinningAmount,
    calculateTotalUserCount,
    targetedSlabs,
    PoolRankAvailability,
    processContestResultTransactions
}


// const <FUNCTION_NAME> =async()=>{
//     try{
        
//     }catch(e){
//         console.log(e);
//         return false;
//     }
// }