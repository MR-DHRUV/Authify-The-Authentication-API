const connectToMongo = require('./db')
const fs = require('fs');
// const path = -require('');
const path = require('path')
const cors = require('cors')
const express = require("express");
const app = express();
const port = 5000;
const User = require('./models/User')
const passport = require('passport');
const bodyparser = require('body-parser')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session')
const jwt = require('jsonwebtoken') // generates a token to identify user,sort of cookie 
const JWT_SECRET = process.env.JWT_SECRET; // for signing web token
var http = require("http");
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}
var nodemailer = require('nodemailer');
const mailPass = process.env.EMAIL_PASS2;



// setInterval(function() {
//     http.get("http://api-authify.herokuapp.com/awake");
// },1000); // every 5 minutes (300000)


const authifyMailer = (to, sub, body) => {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'developer.authify@gmail.com',
            pass: mailPass
        }
    });

    var mailOptions = {
        from: 'developer.authify@gmail.com',
        to: to,
        subject: sub,
        text: body,
    };

    try {
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
                res.status(200).json({ success: true });
                return true
            }
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }

}


const authifyReminder = async(time,to,sub,body)=>{
    
    sleep((time)).then(() => {
        console.log('In sleep');
        authifyMailer(to, sub,body);
    })

}
module.exports =  authifyReminder


let gProfile;
let myToken;
let googlecontextInit;

app.use(express.static('static'))
app.use(bodyparser.urlencoded())


app.use(express.static('static'))
app.use(bodyparser.json()); // support json encoded bodies
app.use(bodyparser.urlencoded({ extended: true })); // support encoded bodies



app.use(session({
    secret: "A little secret",
    resave: false,
    saveUninitialized: false,

}))


app.use(passport.initialize());
app.use(passport.session());
connectToMongo();

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://api-authify.herokuapp.com/auth/google/hello",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",

},
    async function (accessToken, refreshToken, profile, cb) {
        // console.log(profile);
        gProfile = profile;

        if (profile._json.email_verified == true) {
            try {
                let user = await User.findOne({ email: profile._json.email });

                if (user) {
                    const paylord = {
                        user: { // <-- yeh curlybrace isliye aaya kyuki paylord ek object haii jisme user name ka ek object haii au id us user wale object ki id haii;
                            user: user.id
                        }
                    }

                    const authToken = jwt.sign(paylord, JWT_SECRET);
                    myToken = authToken;
                    // console.log(authToken);
                    const success = true;
                    // await res.json({ success, authToken });
                }

                else {
                    try {
                        let user = await User.create({
                            name: profile._json.name,
                            email: profile._json.email,
                            password: null,
                            googleId: profile.id,
                        })

                        // to generation a token or a cookie to identify the user 
                        const data = {
                            user: {
                                user: user.id // id is obtained form mongoose
                            }
                        }
                        // console.log(data);
                        const authToken = jwt.sign(data, JWT_SECRET);
                        myToken = authToken;
                        // console.log(authToken);
                        // res.json({ success, authToken });
                    }

                    catch (error) {
                        console.error(error.message);
                        // res.status(500).send("Some error occured");
                    }
                }
            }

            catch (error) {
                console.error(error.message);
                // res.status(500).send("Some error occured");
            }
        }
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));


app.use(cors());
app.use(express.json());

// Available routes
app.use('/auth', require('./routes/auth.js'))
app.use('/notes', require('./routes/notes.js'));
app.use('/fogotpassword', require('./routes/forgotpass.js'));
app.use('/reminder', require('./routes/reminder.js'));
// app.use('/api/auth/google',require('./routes/google'));

app.get('/auth/google',
    passport.authenticate('google', {
        scope:
            ['email', 'profile']
    }
    ));



app.get('/auth/google/hello',
    passport.authenticate('google',

        {
            successRedirect: `/hello`,
            failureRedirect: '/signin'
        },
        console.log(googlecontextInit)
    )


);


app.put('/auth/googlecontext/:id', async (req, res) => {
    googlecontextInit = req.params.id.substring(1);
    console.log(googlecontextInit);
    res.json({ success: true, uri: googlecontextInit });
    uriRender(googlecontextInit)
})



app.get('/hello', async (req, res) => {
    console.log(googlecontextInit);
    uriRender(googlecontextInit)
    // res.redirect(`/gauth/${googlecontextInit}`)
    res.redirect('/thankyou')

})


const uriRender = (muri) => {

    return app.get(`/auth/g/user/${muri}`, async (req, res) => {

        if (myToken) {
            const authToken = myToken;
            const success = true;
            console.log(authToken);
            res.json({ success, authToken });
            myToken =  null ;
        }
        console.log(myToken);
        // res.send("shggsh");
    })

}

app.get('/thankyou',(req,res)=>{
    res.render('thankyou')
})

app.get('/awake',(req,res)=>{
    // res.sendFile('/views/test2.html')
    // res.sendFile(path.join(__dirname+'/views/test2.html'));
    res.status(200).send("I am awake")
})

app.get('/',(req,res)=>{
    // res.sendFile('/views/test2.html')
    // res.sendFile(path.join(__dirname+'/views/test2.html'));
    res.redirect('https://mr-dhruv.github.io/Authify-Docx/')
})



app.listen(process.env.PORT || port, () => {
    console.log(`Server started on  port ${port}`);
})


