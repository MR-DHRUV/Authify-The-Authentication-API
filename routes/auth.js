require('dotenv').config()
const express = require('express');
const Router = express.Router();
const User = require('../models/User')
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken') // generates a token to identify user,sort of cookie 
const JWT_SECRET = process.env.JWT_SECRET; // for signing web token
const fetchUser = require('../middleware/fetchUserFromToken')





// creating a user using: post "/api/auth"  login is not required by user
Router.post('/signup', [
    body('email', 'Enter a valid email address').isEmail(),
    body('password', 'Password cannot be blank').exists(),
    body('password', 'Enter a valid password of minimum 8 digits').isLength({ min: 8 }),
    body('name', 'Enter a valid name of minimum 3 digits').isLength({ min: 3 })
],
    // if there is validation problem
    async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const success = false;
            return res.status(400).json({success,errors: errors.array() });
        }


        // To check wheather the user exists already with the given email
        let user = await User.findOne({ email: req.body.email })
        if (user) {
            const success = false;
            return res.status(400).json({ success,"error": "User with given email id already exist." })
        }

        // to hash password 
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
                    const success =true;
                    res.json({success,authToken});

                }

                catch (error) {
                    console.error(error.message);
                    res.status(500).send("Some error occured");
                }

            });
        });

    }
)


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
        return res.status(400).json({success, errors: errors.array() });
    }

    // if user exists
    try {
        let user = await User.findOne({ email: req.body.email });
        if (!user) {
            const success = false;
            return res.status(400).json({ success, "error": "User with given email id does not exist." });

        }

        // To compare hashed password
        await bcrypt.compare(req.body.password, user.password, async (err, compareResult) => {
            if (compareResult === false) {
                const success = false;
                return res.status(400).json({ success,error: "Invalid email or password" });
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
            await res.json({success, authToken});

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


