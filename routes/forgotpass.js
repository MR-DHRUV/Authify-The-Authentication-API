require('dotenv').config()
var nodemailer = require('nodemailer');
const express = require('express');
const Router = express.Router();
const User = require('../models/User')
const { body, validationResult } = require('express-validator');
const PassValidator = require('../models/Forgotpass')
const bcrypt = require('bcryptjs');
const authifyMailer = require('./authifyMailer')
const {getCurrentDateAndTime, sendOtp} = require('./helper')

Router.post('/', [
    body('email', 'Enter a valid email address').isEmail(),
], async (req, res) => {

    // to that entered email and password are valid , thay can be misleading or incorrect
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const success = false;
        return res.status(400).json({ success, errors: errors.array() });
    }

    // if user exists
    try {
        let user = await User.findOne({ email: req.body.email });
        if (!user) {
            const success = false;
            return res.status(400).json({ success, "error": "User with given email id does not exist." });
        }

        sendOtp(req, res, 'Verification Code for Password Reset');
    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }
})


Router.post('/verify', [
    body('authcode', 'Enter a valid verification code of 6 digits').isLength({ min: 6 }),
    body('password', 'Enter a valid password of minimum 8 digits').isLength({ min: 8 }),

], async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const success = false;
        return res.status(400).json({ success, errors: errors.array() });
    }

    try {
        // if user exists
        let storeAuthCode = await PassValidator.findOne({ email: req.body.email });
        if (!storeAuthCode) {
            return res.status(400).json('No such user with this email requested to reset password');
        }

        if (storeAuthCode.authcode === req.body.authcode) {
            bcrypt.genSalt(10, async (err, salt) => {
                bcrypt.hash(req.body.password, salt, async (err, hashedPassword) => {
                    authifyMailer(req.body.email, 'Attention Required !!, Password for your account is recently changed', `Hi There,\n\nRecently, Password of your account is changed on ${getCurrentDateAndTime()}.\nIf not done by you please click here.\n\nRegards\nAuthify`);

                    await User.updateOne({ email: req.body.email }, { password: hashedPassword })
                    await PassValidator.deleteOne({ email: req.body.email });
                    res.json({ success: true })
                });
            });
        }
        else {
            return res.status(400).json('Invalid verification code');
        }
    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }
})

module.exports = Router