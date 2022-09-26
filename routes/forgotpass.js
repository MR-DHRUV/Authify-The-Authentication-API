require('dotenv').config()
var nodemailer = require('nodemailer');
const express = require('express');
const Router = express.Router();
const User = require('../models/User')
const { body, validationResult } = require('express-validator');
const PassValidator = require('../models/Forgotpass')
const bcrypt = require('bcryptjs');
const authifyMailer = require('./authifyMailer')

let authCodeCheck;

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
        const trashCode = await PassValidator.findOneAndDelete({email : req.body.email})
        // console.log(trashCode);


        const mailPass = process.env.EMAIL_PASS2;

        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'developer.authify@gmail.com',
                pass: mailPass
            }
        });


        const authCode = Math.floor(100000 + Math.random() * 900000);
        authCodeCheck = authCode;
 
        var mailOptions = {
            from: 'developer.authify@gmail.com',
            to: req.body.email,
            subject: 'Verification Code',
            text: 'Your verification code is ' + authCode,
        };


        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);

                try {
                    let storeAuthCode = PassValidator.create({
                        email: req.body.email,
                        authcode: authCode,
                    })
                    res.json({success: true , message:"Email Send"})
                }

                catch (error) {
                    console.error(error.message);
                    res.status(500).send("Some error occured");
                }
            }
        });


    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }
}
)



Router.post('/verify', [
    body('authcode', 'Enter a valid verification code of 6 digits').isLength({ min: 6 }),
    body('password', 'Enter a valid password of minimum 8 digits').isLength({ min: 8 }),

], async (req, res) => {

    // to that entered email and password are valid , thay can be misleading or incorrect
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const success = false;
        return res.status(400).json({ success, errors: errors.array() });
    }

    // if user exists
    try {

        let storeAuthCode = await PassValidator.findOne({ email: req.body.email });
        // console.log(storeAuthCode);
        // const emailTochangePass = storeAuthCode.authcode;
        // console.log(emailTochangePass);

        if (!storeAuthCode) {
            return res.status(400).json('No such user with this email requested to reset password');
        }

        try {

            if (storeAuthCode.authcode === req.body.authcode) {

                bcrypt.genSalt(10, async (err, salt) => {
                    bcrypt.hash(req.body.password, salt, async (err, hashedPassword) => {
                        try {
                            const date = new Date()
                            const dnt = date.getDate() + '-' + date.getMonth() + '-' + date.getFullYear() + ' at ' + date.getHours() + ':' + date.getMinutes();
                            const sub = 'Attention Required !!, Password for your account is recently changed'

                            const msg = `Hi There,\n\nRecently, Password of your account is changed on ${dnt}.\nIf not done by you please click here.\n\nRegards\nAuthify`

                            authifyMailer(req.body.email, sub, msg);

                            await User.updateOne({ email: req.body.email }, { password: hashedPassword })
                            res.json({success: true})
                            await PassValidator.deleteOne({ email: req.body.email });
                        }

                        catch (error) {
                            console.error(error.message);
                            res.status(500).send("Some error occured");
                        }

                    });
                });


            }

        } catch (error) {
            console.error(error.message);
            res.status(500).send("Some error occured");
        }




    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }
}
)

module.exports = Router



























