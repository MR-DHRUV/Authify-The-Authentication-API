const express = require('express');
const User = require('../models/User')
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET;
const authifyMailer = require('./authifyMailer.js')
const Router = express.Router();
const {getCurrentDateAndTime} = require('./helper.js')

passport.use(User.createStrategy());
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:5000/auth/google/hello",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",

}, async function (accessToken, refreshToken, profile, cb) {
    if (profile._json.email_verified == true) {
        try {

            let user = await User.findOne({ email: profile._json.email });
            if (!user) {
                user = await User.create({
                    name: profile._json.name,
                    email: profile._json.email,
                    username: profile._json.email,
                    password: null,
                    googleId: profile.id,
                })

                authifyMailer(user.email, 'Account Registeration Successfull', `Hi ${user.name},\n\nUser registeration completed successfully.\nThanks for creating account with us.\nIf not done by you please click here\n\nRegards\nAuthify`);
            }
            else {
                authifyMailer(user.email, 'New Login Activity', `Hi ${user.name},\n\nLogin activity for your account detected on ${getCurrentDateAndTime()}\nIf not done by you please click here.\n\nRegards\nAuthify`);
            }
            
            const data = {
                user: {
                    user: user.id
                }
            }

            cb(null, { authToken: jwt.sign(data, JWT_SECRET) });
        }

        catch (error) {
            console.error(error.message);
            cb(error, null);
        }
    }
}));

// Redirect user back to the specified URL with authToken as query parameter
Router.get('/', (req, res, next) => {
    passport.authenticate('google', {
        scope: ['email', 'profile'],
        state: req.query.url // Pass the URL as state
    })(req, res, next);
});

Router.get('/hello',
    passport.authenticate('google', { session: false }),
    (req, res) => {
        const { authToken } = req.user;
        const redirectUrl = `${req.query.state}?authToken=${authToken}`; // Append authToken to the provided URL
        res.redirect(redirectUrl);
    }
);

module.exports = Router;
