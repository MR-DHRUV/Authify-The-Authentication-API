require('dotenv').config()
const express = require('express');
const Router = express.Router();
const User = require('../models/User')
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken') // generates a token to identify user,sort of cookie 
const JWT_SECRET = process.env.JWT_SECRET; // for signing web token
const fetchUser = require('../middleware/fetchUserFromToken')
const PassValidator = require('../models/Forgotpass')
var nodemailer = require('nodemailer');
const authifyMailer = require('./authifyMailer')




// creating a user using: post "/api/auth"  login is not required by user
Router.post('/signup/email/verify', [
    body('email', 'Enter a valid email address').isEmail(),
    body('password', 'Password cannot be blank').exists(),
    body('password', 'Enter a valid password of minimum 8 digits').isLength({ min: 8 }),
    body('name', 'Enter a valid name of minimum 3 digits').isLength({ min: 3 }),
    body('authcode', 'Enter 6 digit verification code send to your email').isLength({ min: 6 })
],
    // if there is validation problem
    async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const success = false;
            return res.status(400).json({ success, errors: errors.array() });
        }

        // To check wheather the user exists already with the given email
        let user = await User.findOne({ email: req.body.email })
        if (user) {
            return res.status(400).json({ success: false, "error": "User with given email id already exist." })
        }

        try {

            let storeAuthCode = await PassValidator.findOne({ email: req.body.email });


            if (!storeAuthCode) {
                return res.status(400).json({ message: 'No such user with this email requested to create a new account', success: false });
            }

            if (storeAuthCode.authcode !== req.body.authcode) {
                return res.status(400).json({ message: 'Invalid Verification code', success: false });
            }


            if (storeAuthCode.authcode === req.body.authcode) {
                try {
                    bcrypt.genSalt(10, async (err, salt) => {
                        bcrypt.hash(req.body.password, salt, async (err, hashedPassword) => {

                            // Store hash in your DB and to Creates a new user
                            try {
                                let user = await User.create({
                                    name: req.body.name,
                                    email: req.body.email,
                                    password: hashedPassword,
                                })

                                // to generation a token or a cookie to identify the user 
                                const data = {
                                    user: {
                                        user: user.id // id is obtained form mongoose
                                    }
                                }
                                // console.log(data);
                                const authToken = jwt.sign(data, JWT_SECRET)
                                // console.log(authToken);

                                const msg = `Hi ${req.body.name},\n\nUser registeration completed successfully.\nThanks for creating account with us.\nIf not done by you please click here\n\nRegards\nAuthify`;

                                const sub = 'Account Registeration Successfull';

                                authifyMailer(req.body.email, sub, msg);

                                // console.log('success', success);

                                const success = true;
                                res.status(200).json({ success, authToken });
                            }

                            catch (error) {
                                console.error(error.message);
                                res.status(500).send("Some error occured");
                            }

                        });
                    });
                } catch (error) {
                    console.error(error.message);
                    res.status(500).send("Some error occured");
                }
            }
        }
        catch (error) {
            console.error(error.message);
            res.status(500).send("Some error occured");
        }
    }
)

Router.post('/signup/email', [
    body('email', 'Enter a valid email address').isEmail(),
],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const success = false;
            return res.status(400).json({ success, errors: errors.array() });
        }

        let user = await User.findOne({ email: req.body.email })
        if (user) {
            return res.status(400).json({ success: false, "error": "User with given email id already exist." })
        }

        // sending otp for verification of email
        try {
            const trashCode = await PassValidator.findOneAndDelete({ email: req.body.email })
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
                        res.json({ success: true, message: "Email Send" })
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

    })


// to authenticate a user while the user login  login is not required by user
Router.post('/signin', [
    body('email', 'Enter a valid email address').isEmail(),
    body('password', 'Password cannot be blank').exists(),
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
        let user = await User.findOne({ email: req.body.email });
        if (!user) {
            const success = false;
            return res.status(400).json({ success, "error": "User with given email id does not exist." });

        }

        // To compare hashed password
        bcrypt.compare(req.body.password, user.password, async (err, compareResult) => {
            if (compareResult === false) {
                const success = false;
                return res.status(400).json({ success, error: "Invalid email or password" });
            }

            const paylord = {
                user: { // <-- yeh curlybrace isliye aaya kyuki paylord ek object haii jisme user name ka ek object haii au id us user wale object ki id haii;
                    user: user.id
                }
            }
            // console.log(paylord); See HERE 
            const authToken = await jwt.sign(paylord, JWT_SECRET)
            // console.log(authToken);
            const success = true;
            const date = new Date()
            const dnt = date.getDate() + '-' + date.getMonth() + '-' + date.getFullYear() + ' at ' + date.getHours() + ':' + date.getMinutes();
            const sub = 'New Login Activity'
            const msg = `Hi ${user.name},\n\nLogin activity for your account detected on ${dnt}\nIf not done by you please click here.\n\nRegards\nAuthify`
            authifyMailer(req.body.email, sub, msg);
            await res.json({ success, authToken });

        });

    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }
}
)


// Route -3 Obtaining details from jws token or decrypting token  login is required by user

Router.post('/verifyuser', fetchUser, async (req, res) => {

    try {
        const userId = req.userId;
        const userWithId = await User.findById(userId).select('-password');
        if (!userWithId) {
            return res.status(401).send({ error: "Please authenticate using a valid token" })
        }
        else {
            res.send(userWithId);
        }

    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }

})


module.exports = Router


Router.post('/delete/email', [
    body('email', 'Enter a valid email address').isEmail(),
],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const success = false;
            return res.status(400).json({ success, errors: errors.array() });
        }

        let user = await User.findOne({ email: req.body.email })
        if (!user) {
            return res.status(400).json({ success: false, "error": "No User with given email id exists." })
        }

        // sending otp for verification of email
        try {
            const trashCode = await PassValidator.findOneAndDelete({ email: req.body.email })
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
                subject: ' Verification Code For *ACCOUNT DELETION*',
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
                        res.json({ success: true, message: "Email Send" })
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

    })


Router.post('/delete/email/verify', [
    body('email', 'Enter a valid email address').isEmail(),
    body('password', 'Password cannot be blank').exists(),
    body('password', 'Enter a valid password of minimum 8 digits').isLength({ min: 8 }),
    body('authcode', 'Enter 6 digit verification code send to your email').isLength({ min: 6 })
],
    // if there is validation problem
    async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const success = false;
            return res.status(400).json({ success, errors: errors.array() });
        }

        // To check wheather the user exists already with the given email
        let user = await User.findOne({ email: req.body.email })
        if (!user) {
            return res.status(400).json({ success: false, "error": "No user with given email id exists." })
        }


        try {

            let storeAuthCode = await PassValidator.findOne({ email: req.body.email });


            if (!storeAuthCode) {
                return res.status(400).json({ message: 'No such user with this email requested to delete a new account', success: false });
            }

            if (storeAuthCode.authcode !== req.body.authcode) {
                return res.status(400).json({ message: 'Invalid Verification code', success: false });
            }


            if (storeAuthCode.authcode === req.body.authcode) {
                try {

                    bcrypt.compare(req.body.password, user.password, async (err, compareResult) => {
                        if (compareResult === false) {
                            const success = false;
                            return res.status(400).json({ success, error: "Invalid email or password" });
                        }

                        await User.deleteOne({ email: req.body.email })
                        const success = true;

                        const date = new Date()
                        const dnt = date.getDate() + '-' + date.getMonth() + '-' + date.getFullYear() + ' at ' + date.getHours() + ':' + date.getMinutes();
                        const sub = 'New Login Activity'

                        const msg = `Hi ${user.name},\n\nAccount deleted on${dnt}.\n\nRegards\nAuthify`

                        authifyMailer(req.body.email, sub, msg);

                        await res.json({ success });
                    });
                } catch (error) {
                    console.error(error.message);
                    res.status(500).send("Some error occured");
                }
            }
        }
        catch (error) {
            console.error(error.message);
            res.status(500).send("Some error occured");
        }
    }
)   