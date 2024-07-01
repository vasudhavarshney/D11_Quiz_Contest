const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const Chance = require('chance');
const chance = new Chance();

const UserSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            default: function() {
                return chance.string({ length: 5, pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890' });
            }
        },
        email: {
            type: String,
            unique: true,
            required: [true, 'please provide a email.'],
            default: null
        },
        mobile: {
            type: String,
            unique: true,
            required: [true, 'please provide a mobile number.'],
            validate: {
                validator: function (v) {
                    return /^[3-9]\d{9}$/.test(v)
                },
                message: props => `${props.value} is not a valid phone number!.`
            },
            minlength: [10, 'Mobile has been support 10 digits only.'],
            maxlength: [10, 'Mobile has been support 10 digits only.']
        },
        role: {
            type: String,
            enum: ['user'],
            default: 'user'
        },
        verificationToken: String,
        isVerified: {
            type: Boolean,
            default: false
        },
        status: {
            type: Boolean,
            default: true
        },
        wallet_balance: {
            type: Number,
            default: 0
        },
        verified: Date,
        aadhar_no: {
            type: String,
            default: null
        },
        aadhar_image: {
            type: String,
            default: null
        },
        image: {
            type: String,
            default: null
        },
        password: {
            type: String,
            required: [true, 'Please provide password'],
        },
        referral_code: {
            type: String,
            required: [false, 'Please provide referal code'],
            default:chance.string({length: 8, pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'})
        },
        referred_by: {
            type: Object,
            default: null
        },
        created_by: {
            type: mongoose.Types.ObjectId,
            ref: 'Admins',
            default: null
            // required: true
        },
        Kyc_status :{ type: String, default: 'Not_Started', required: false },
        kyc_remark: { type: String, default: null, required: false },
        // current_Referral_Earned_amount: { type: Number, default: 0, required: false },
        total_Referral_Earned_amount: { type: Number, default: 0, required: false },
        Referred_User_Count: { type: Number, default: 0, required: false },
        total_winning_amount: { type: Number, default: 0, required: false },
        Current_withdable_amount: { type: Number, default: 0, required: false },
        
    },
    { timestamps: true }
)

UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
})

UserSchema.methods.comparePassword = async function (canditatePassword) {
    const isMatch = await bcrypt.compare(canditatePassword, this.password)
    return isMatch
}

module.exports = mongoose.model('User', UserSchema)

