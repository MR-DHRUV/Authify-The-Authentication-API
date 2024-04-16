require('dotenv').config()
const nodemailer = require('nodemailer');

// General mailer to send notifications
const authifyMailer = (to, sub, body) => {
    return new Promise((resolve, reject) => {
        const mailPass = process.env.EMAIL_PASS2;

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
                    reject(false)
                } else {
                    console.log('Email sent: ' + info.response);
                    resolve(true)
                    return true
                }
            });
        } catch (error) {
            console.error(error.message);
            reject(false)
        }
    });
}

module.exports = authifyMailer