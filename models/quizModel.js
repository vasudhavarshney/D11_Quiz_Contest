const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const quizSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true ,ref:'User',index: true},
    poolId: { type: mongoose.Schema.Types.ObjectId,ref:'Pool', required: true ,index: true},
    contestId: { type: mongoose.Schema.Types.ObjectId,ref:'Contest', required: true,index: true },
    answers: [{
        _id: false,
        question_id: { type: mongoose.Schema.Types.ObjectId, required: true,
            // validate: {
            //     validator: async function(questionId) {
            //         const contest = await mongoose.model('Contest').findById(this.contestId);
            //         if (!contest) return false; // Contest not found
            //         const questionExists = contest.questions.some(question => question._id.equals(questionId));
            //         return questionExists;
            //     },
            //     message: 'Invalid question ID for the specified contest',
            // }
         },
        answered_Option_id: { type: mongoose.Schema.Types.ObjectId, required: true }
    }],
    submitted: { type: Boolean, default: false },
    earned_points:{ type: Number, default: 0 },
	total_Points:{ type: Number },
    rank:{ type: Number, default: null },
    rankSlab:{ type: String,default: null,required: false },
    winning_amount :{ type: Number, default: 0,required: false },
    giftName :{ type: String, default: null,required: false },
    giftImagePath :{ type: String, default: null,required: false }
},{timestamps:true});

quizSchema.pre('save',async function(next) {
    try {
        const contest = await mongoose.model('Contest').findOne({_id:this.contestId});
        // console.log(JSON.stringify(contest));
        if (!contest) {
            throw new Error('Contest not found');
        }
        const arr = contest.questions
        this.total_Points = arr.reduce((sum, item) => sum + item.Weight, 0);
    //    console.log(contest)
        const invalidAnswers = this.answers.filter(answer => {
            const questionExists = contest.questions.some(question => question._id.equals(answer.question_id));
            return !questionExists;
        });
        if (invalidAnswers.length > 0) {
            throw new Error('Invalid question ID(s) for the specified contest');
        }
       if(this.rank!==null){
            const pool = await mongoose.model('Pool').findById(this.poolId);
            console.log("pool-------------->",pool,this.rank,this.rankSlab )
            if (!pool) return false; 
            const pooldetails=pool.winningSlabs.find(slab => slab.rank===this.rankSlab  );
            console.log("pooldetails-------------->",pooldetails)
            if(pooldetails.reward_Type ==='Gift'){
                console.log("pooldetails-------------->",pooldetails)
                this.winning_amount =0;
                this.giftName = pooldetails.giftName;
                this.giftImagePath = pooldetails.giftImagePath;
            }else if(pooldetails.reward_Type ==='Money'){
                this.winning_amount = pooldetails.winningAmount;
                this.giftName = null;
                this.giftImagePath = null;
            }
            
        }
        
        next();
    } catch (error) {
        next(error);
    }
});
quizSchema.pre('save',async function() {
    const contest = await mongoose.model('Contest').findById(this.contestId);
    if (!contest) return false; 
    
})
// Apply the mongoose-paginate-v2 plugin
quizSchema.plugin(mongoosePaginate);


const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;
