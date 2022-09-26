const mongoose = require('mongoose');

const NotesSchema = new mongoose.Schema({

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
    tag : {
        type : String,
        default : "general"
    },
    reminder : {
        type : String,
        default : null
    },
    date : {
        type : Date,
        default : Date.now
    },

})

module.exports = mongoose.model('notes',NotesSchema);
