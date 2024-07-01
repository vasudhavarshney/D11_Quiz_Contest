const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');



const winningSlabSchema = new mongoose.Schema({
    rank: { type: String, required: true },
    winnerCount: { type: Number, required: true },
    allTaken:{ type: Boolean, required: true, default: false },
    reward_Type: { type: String, enum:["Gift","Money"],required: true},
    winningAmount: { type: Number, required: false, default:0},
    giftName:{type: String, required: false},
    giftImagePath:{type: String, required: false}
});

const poolSchema = new mongoose.Schema({
    contestId: { type: mongoose.Schema.Types.ObjectId, required: true , ref:'Contest',index: true },
    entryFee: { type: Number, required: true },
    banner: { type: String, required: false },
    maxUserCount: { type: Number, required: true },
    // questions: [questionSchema], // Embedding questions schema
    initialUserCount: {
        type: Number,
        required: true,
        validate: {
            validator: function(value) {
                return value <= this.maxUserCount;
            },
            message: 'Pool User limit exceeded',
        },
    },
    ActualUserCount: {
        type: Number,
        required: false,
        default:0,
        validate: {
            validator: function(value) {
                return value <= this.maxUserCount;
            },
            message: 'Pool User limit exceeded',
        },
    },
    maxWinningAmount: { type: Number, required: true },
    Rank_Declare_Complete: { type: Boolean, required: false },
    winningSlabs: {
        type: [winningSlabSchema],
        validate: {
            validator: function(slabs) {
                let totalWinningAmount = 0;
                slabs.forEach(slab => {
                    totalWinningAmount += slab.winnerCount * slab?.winningAmount || 0;
                });
                return totalWinningAmount <= this.maxWinningAmount;
            },
            message: 'Total winning amount exceeds max winning amount',
        },
    },
},{timestamps:true});

const validateWinningSlab= async function(next) {
    const docToUpdate = await this.model.findOne(this.getQuery());
    const updatedFields = this.getUpdate().$set;
    if (updatedFields && updatedFields.winningSlabs) {
        const totalWinningAmount = updatedFields.winningSlabs.reduce((total, slab) => {
            return total + slab.winnerCount * slab.winningAmount;
        }, 0);
        if (totalWinningAmount > docToUpdate.maxWinningAmount) {
            throw new Error('Total winning amount exceeds pool max winning amount: '+docToUpdate.maxWinningAmount);
        }
    }
    next();
} 
// Validate winningSlabs on update
poolSchema.pre('findOneAndUpdate', validateWinningSlab);
poolSchema.plugin(mongoosePaginate);


module.exports = mongoose.model('Pool', poolSchema);

