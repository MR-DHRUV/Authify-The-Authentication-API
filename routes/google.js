require('dotenv').config()
const express = require('express');
const Router = express.Router();
const User = require('../models/User')

const jwt = require('jsonwebtoken') // generates a token to identify user,sort of cookie 
const JWT_SECRET = process.env.JWT_SECRET; // for signing web token

const passport = require('passport');

const bodyparser = require('body-parser')


const GoogleStrategy = require('passport-google-oauth20').Strategy;



Router.use(bodyparser.json()); // support json encoded bodies
Router.use(bodyparser.urlencoded({ extended: true })); // support encoded bodies

Router.use(passport.initialize());





passport.use(User.createStrategy());


// passport.use(new GoogleStrategy({
//     clientID: process.env.CLIENT_ID,
//     clientSecret: process.env.CLIENT_SECRET,
//     callbackURL: "http://127.0.0.1:3000/auth/google/hello",
//     userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
//     passReqToCallback: true
// },
//     function (request, accessToken, refreshToken, profile, done) {
//         console.log(profile);
//         User.findOrCreate({ email: profile.id }, function (err, user) {
//             return done(err, user);
//         });
//     }
// ));

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://127.0.0.1:3000/auth/google/hello",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",

},
    (accessToken, refreshToken, profile, cb)=>{
        console.log('on')
        console.log(accessToken);
        console.log(refreshToken);
        console.log(profile);
        User.findOrCreate({ email: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));



Router.get('/',
    passport.authenticate('google', {
        scope:
            ['email', 'profile']
    }
    )
);


Router.get('/hello',
    passport.authenticate('google', {
        successRedirect: 'auth/google/hello',
        failureRedirect: '/'
    })
);



module.exports = Router





