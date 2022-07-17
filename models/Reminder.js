const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({

    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'user',
        required : true
    },

    title : {
        type : String,
        required : true
    },
    description : {
        type : String,
        required : true,
    },
    timeToRemind : {
        type : String,
        required : true
    },
    date : {
        type : Date,
        default : Date.now
    },

})

module.exports = mongoose.model('reminder',ReminderSchema);
