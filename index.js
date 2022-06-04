const connectToMongo = require('./db')
const fs = require('fs');
// const path = -require('');
const path = require('path')
const cors = require('cors')
const express = require("express");
const app = express();
const port = 3000;
const User = require('./models/User')
const passport = require('passport');
const bodyparser = require('body-parser')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session')
const jwt = require('jsonwebtoken') // generates a token to identify user,sort of cookie 
const JWT_SECRET = process.env.JWT_SECRET; // for signing web token


let gProfile;
let myToken;
let googlecontextInit;

app.use(express.static('static'))
app.use(bodyparser.urlencoded())


app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'))
app.use(express.static (path.join(__dirname, 'public')))

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
    callbackURL: "http://127.0.0.1:3000/auth/google/hello",
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
app.use('/api/auth', require('./routes/auth.js'))
app.use('/api/notes', require('./routes/notes.js'));
app.use('/api/fogotpassword', require('./routes/forgotpass.js'));
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


app.put('/googlecontext/:id', async (req, res) => {
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

    return app.get(`/gauth/${muri}`, async (req, res) => {

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



app.listen(process.env.PORT || port, () => {
    console.log(`Server started on  port ${port}`);
})


