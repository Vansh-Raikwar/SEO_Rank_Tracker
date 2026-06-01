import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },
    password:{
        type:String,
        required:true,
        min:8,
        select:false
    },
    plan:{
        type:String,
        enum:["free","pro"], 
        default:"free"
    },
    subscriptionStart: {
        type: Date,
        default: null
    },
    subscriptionEnd: {
        type: Date,
        default: null
    },
    analysisCount:{
        type:Number,
        default:0
    },
    lastAnalysisDate:{
        type:Date,
        default:null
    },
    verifyOtp:{
        type:String,
        default:""
    },
    verifyOtpExpireAt:{
        type:Number,
        default:0
    },
    isAccountVerified:{
        type:Boolean,
        default:false
    },
    resetOtp:{
        type:String,
        default:""
    },
    resetOtpExpireAt:{
        type:Number,
        default:0
    },
    usedScans:{
        type:Number,
        default:0
    },
    scansRefreshAt:{
        type:Date,
        default:null
    },
    planExpiresAt:{
        type:Date,
        default:null
    },
    razorpayOrderId:{
        type:String,
        default:""
    },
    razorpayPaymentId:{
        type:String,
        default:""
    }
},{timestamps:true})


const User = mongoose.model("User",userSchema)

export default User