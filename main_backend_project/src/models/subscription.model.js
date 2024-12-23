import mongoose,{Schema} from "mongoose"

const subscriptionSchema = new Schema({
    subscriber:{
        type: Schema.Types.ObjectId, // one who subscribe
        ref :"User"
    },
    channel:{
        type: Schema.Types.ObjectId, // one whom subscriber is subscribing
        ref :"User"
    },

},{timestamps:true})

const Subscription = mongoose.model("Subscription",subscriptionSchema)