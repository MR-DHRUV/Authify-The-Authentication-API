const PassValidator = require("../models/Forgotpass");
const authifyMailer = require("./authifyMailer");

function getCurrentDateAndTime() {
    const dateNI = new Date();
    var ISToffSet = 330; //IST is 5:30; i.e. 60*5+30 = 330 in minutes 
    offset = ISToffSet * 60 * 1000;
    var date = new Date(dateNI.getTime() + offset);
    return date.getDate() + '-' + date.getMonth() + 1 + '-' + date.getFullYear() + ' at ' + date.getHours() + ':' + date.getMinutes();
}

async function sendOtp(req, res, subject) {
    try {
        const trashCode = await PassValidator.findOneAndDelete({ email: req.body.email })
        const authCode = Math.floor(100000 + Math.random() * 900000);

        if (await authifyMailer(req.body.email, subject, 'Your verification code is ' + authCode)) {
            let storeAuthCode = PassValidator.create({
                email: req.body.email,
                authcode: authCode,
            })
            res.json({ success: true, message: "Email Send" })
        }
        else {
            console.error(error.message);
            res.status(500).send("Some error occured");
        }
    } catch (error) {
        res.status(500).send("Some error occured");
    }
}

module.exports = { getCurrentDateAndTime, sendOtp };

