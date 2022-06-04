const connectToMongo = require('./db')
const fs = require('fs');
const path =-require('path');
const cors = require('cors')
const express = require("express");
const app = express();
const port = 3000;

connectToMongo(); 

app.use(cors());
app.use(express.json());

// Available routes
app.use('/api/auth',require('./routes/auth.js'))
app.use('/api/notes',require('./routes/notes.js'));
app.use('/api/auth/google',require('./routes/google'));

app.get('/auth/google/hello',(req,res)=>{
    res.send("shggsh")
})

app.listen(port,()=>{
    console.log(`Server started on  port ${port}`);
})


