require('dotenv').config()
const mongoose = require('mongoose');
const mongoURI = process.env.mongoURI;

const connectToMongo = ()=>{
    mongoose.connect(String(mongoURI),()=>{
        console.log("connected to mongo database");
    })
}



module.exports = connectToMongo;