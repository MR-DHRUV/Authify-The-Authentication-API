require('dotenv').config()
const jwt = require('jsonwebtoken');


//Get the user from the jwt token add add id to the req object 
const fetchUser = async (req, res, next) => {


    // bringing token from user
    const token = req.header('auth-token');
    if (!token) {
        return res.status(401).send({ error: "Please authenticate using a valid token" })
    }

    try {
        const data = jwt.verify(token, process.env.JWT_SECRET) //will decode the token
        // console.log(data);
        // console.log(data.user.id);
        req.userId = data.user.user;
        next()
        // data.user returns a object named user having a object user which has id
        // {
        //  user : { user: id },
        //  iat:   }
    }

    catch (error) {
        res.status(401).send({ error: "Please authenticate using a valid token" })
    }
    
}

module.exports = fetchUser;
