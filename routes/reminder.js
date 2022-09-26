const express = require('express');
const Router = express.Router();
const fetchUser = require('../middleware/fetchUserFromToken')
const userNotes = require('../models/UserNotes');
const { body, validationResult } = require('express-validator');
const UserNotes = require('../models/UserNotes');
const mongoose = require('mongoose');
// const authifyMailer = require('./authifyMailer')
var nodemailer = require('nodemailer');
const User = require('../models/User')
const mailPass = process.env.EMAIL_PASS2;
const Reminder = require('../models/Reminder')
const authifyReminder = require('../index')

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}
var ObjectId = require('mongoose').Types.ObjectId;

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


// const authifyReminder = async(time,to,sub,body)=>{

//     sleep((time)).then(() => {
//         console.log('In sleep');
//         authifyMailer(to, sub,body);
//     })

// }



// to get all reminders :login will be required 
Router.get('/fetch_all_reminders', fetchUser, async (req, res) => {
    try {
        const reminders = await Reminder.find({ user: req.userId });
        res.json(reminders);
    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }

})

// //<==============  User ki ID header me jaygiii =======================================================================================================================>


// // Updating a existing REMINDER : Login is required

Router.put('/update_existing_reminder/:id', [], fetchUser, async (req, res) => {
    //Creating new note object
    if (ObjectId.isValid(String(req.params.id)) == false) {
        return res.status(404).json("Not Found");
    }
    let newReminder = {}; //Empty object

    //to make sure only those feilds are updated that a user has made 
    if (req.body.title != null) { newReminder.title = req.body.title; }
    if (req.body.description != null) { newReminder.description = req.body.description; }
    if (req.body.time != null) { newReminder.timeToRemind = req.body.time; }

    //Finding note by id
    let reminder = await Reminder.findOne({ _id: req.params.id })

    // if no note corresponding to note id is found in database
    if (!reminder) {
        return res.status(404).send("Not Found");
    }

    try {

        const user = await User.findOne({ _id: req.userId });
        if (!user) {
            return res.send(400).send("User Not Found")
        }

        // if user tries to acsess some random note by changing note id
        if (reminder.user.toString() !== req.userId) {
            return res.status(401).send("NOT ALLOWED")
        }

        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const constructor = new Date(req.body.time);
        const dateToDisplay = constructor.getDate() + ' ' + monthNames[constructor.getMonth()] + ', ' + constructor.getFullYear() + ', ' + constructor.getHours() + ":" + constructor.getMinutes();


        // if all ok, to update
        newReminder = await Reminder.findOneAndUpdate({ _id: req.params.id }, { $set: newReminder, new: true });
        let displayReminder = await Reminder.findOne({ _id: req.params.id })

        const titleConstructor = `Updated, Reminder set for ${dateToDisplay} to ${req.body.title} `
        const bodyconstructor = `HI ${user.name},\n\nYour reminder has been updated to ${dateToDisplay} \n${req.body.description}`



        authifyMailer(user.email, titleConstructor, bodyconstructor)

        const dateNI = new Date();
        var ISToffSet = 330; //IST is 5:30; i.e. 60*5+30 = 330 in minutes 
        offset = ISToffSet * 60 * 1000;
        var ISTTime = new Date(dateNI.getTime() + offset);
        console.log("IST" , ISTTime);

        const timeDiffrenceMs = (new Date(req.body.time) - ISTTime)
        console.log(timeDiffrenceMs);
        // sleep((timeDiffrenceMs)).then(() => {
        //     console.log('In sleep');
        //     authifyMailer(user.email, `Reminder for ${displayReminder.title}`, `HI ${user.name},\n\nReminder for,\n${displayReminder.description}`);
        // })

        authifyReminder(timeDiffrenceMs, user.email, `Reminder for ${displayReminder.title}`, `HI ${user.name},\n\nReminder for,\n${displayReminder.description}`)

        // res.json(displayReminder);
    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }

})





// To  set reminder : login required
Router.post('/add_reminder', [
    body('title', "Please enter a valid title").isLength({ min: 3 }),
    body('description', "Please enter a valid title").isLength({ min: 5 }),
], fetchUser, async (req, res) => {

    //Checking all the required paprams are of correct type
    const errorsInInput = validationResult(req);
    if (!errorsInInput.isEmpty()) {
        return res.status(400).json({ error: errorsInInput.array() });
    }

    // if user corresponding to user-id is found in database
    if (!req.userId) {
        return res.status(404).send("Invalid UserId");
    }

    try {
        // if no user corresponding to userdId is there
        const user = await User.findOne({ _id: req.userId });
        if (!user) {
            return res.send(400).send("User Not Found")
        }
        // console.log(time);

        //to save reminder in DB
        const reminder = new Reminder({
            user: req.userId,
            title: req.body.title,
            description: req.body.description,
            timeToRemind: req.body.time,
        })

        const savedReminder = await reminder.save();
        res.json(savedReminder);

        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const constructor = new Date(req.body.time);
        const dateToDisplay = constructor.getDate() + ' ' + monthNames[constructor.getMonth()] + ', ' + constructor.getFullYear() + ', ' + constructor.getHours() + ":" + constructor.getMinutes();

        const titleConstructor = `Reminder set for ${dateToDisplay} to ${req.body.title} `
        const bodyconstructor = `HI ${user.name},\n\nReminder set for ${dateToDisplay} \n${req.body.description}`
        authifyMailer(user.email, titleConstructor, bodyconstructor)

        const dateNI = new Date();
        var ISToffSet = 330; //IST is 5:30; i.e. 60*5+30 = 330 in minutes 
        offset = ISToffSet * 60 * 1000;
        var ISTTime = new Date(dateNI.getTime() + offset);
        console.log("IST" , ISTTime);

        const timeDiffrenceMs = (new Date(req.body.time) -ISTTime)
        console.log(timeDiffrenceMs);

        //sleeping for required time
        // sleep(timeDiffrenceMs).then(() => {
        //     authifyMailer(user.email, `Reminder for ${req.body.title}`, `HI ${user.name},\n\nReminder for,\n${req.body.description}`);
        // })
        authifyReminder(timeDiffrenceMs, user.email, `Reminder for ${req.body.title}`, `HI ${user.name},\n\nReminder for,\n${req.body.description}`)

    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }

})


// To delete a reminder : login required
Router.get('/delete_reminder/:id', fetchUser, async (req, res) => {

    if (req.params.id == undefined || req.params.id == null) {
        return res.status(404).json("Not Found");
    }
    if (ObjectId.isValid(String(req.params.id)) == false) {
        return res.status(404).json("Not Found");
    }

    let reminder = await Reminder.findOne({ _id: req.params.id })
    // console.log(note);

    if (!reminder) {
        return res.status(404).send("Not Found");
    }

    try {

        await Reminder.findOneAndDelete({ _id: req.params.id });
        res.json({ result: "Reminder deleted successfully" })

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }
})




module.exports = Router
