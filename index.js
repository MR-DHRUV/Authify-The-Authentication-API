const connectToMongo = require('./db')
const cors = require('cors')
const express = require("express");
const app = express();
const port = 5000;
const passport = require('passport');
const bodyparser = require('body-parser')
const session = require('express-session')

connectToMongo();

app.use(express.static('static'))
app.use(bodyparser.json()); // support json encoded bodies
app.use(bodyparser.urlencoded({ extended: true })); // support encoded bodies
app.use(cors());
app.use(express.json());

app.use(session({
    secret: "A little secret",
    resave: false, // we dont want to save the session
    saveUninitialized: false, // dont save empty value in session
}))

app.use(passport.initialize());
app.use(passport.session());

// Available routes
app.use('/auth', require('./routes/auth.js'))
app.use('/auth/google', require('./routes/google.js'))
app.use('/fogotpassword', require('./routes/forgotpass.js'));

app.get('/', (req, res) => {
    res.redirect('https://mr-dhruv.github.io/Authify-Docx/')
})

app.listen(process.env.PORT || port, () => {
    console.log(`Server started on  port ${port}`);
})