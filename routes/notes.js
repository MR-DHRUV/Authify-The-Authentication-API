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
const BCC = process.env.EMAIL;
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}
var ObjectId = require('mongoose').Types.ObjectId;
const removeMd = require('remove-markdown');
const authifyMailer = require('./authifyMailer');



// to get all the notes :login will be required 
Router.get('/fetch_all_notes', fetchUser, async (req, res) => {
    try {
        const notes = await userNotes.find({ user: req.userId });
        res.json(notes);
    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }

})

//<==============  User ki ID header me jaygiii =======================================================================================================================>



// to add a new note : login will be required 
Router.post('/add_note', fetchUser, [
    body('title', "Please enter a valid title").isLength({ min: 3 }),
    body('description', "Please enter a valid title").isLength({ min: 5 }),

], async (req, res) => {


    try {

        const { title, description, tag } = req.body;

        const errorsInInput = validationResult(req);
        if (!errorsInInput.isEmpty()) {
            return res.status(400).json({ error: errorsInInput.array() });
        }

        const note = new userNotes({
            user: req.userId, title, description, tag
        })

        const savedNote = await note.save();
        res.json(savedNote);
    }

    catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }


})

// Updating a existing note : Login is required

Router.put('/update_existing_note/:id', [], fetchUser, async (req, res) => {
    //Creating new note object
    let newNote = {}; //Empty object

    //to make sure only those feilds are updated that a user has made 
    if (req.body.title != null) { newNote.title = req.body.title; }
    if (req.body.description != null) { newNote.description = req.body.description; }
    if (req.body.tag != null) { newNote.tag = req.body.tag; }

    if (ObjectId.isValid(String(req.params.id)) == false) {
        return res.status(404).json("Not Found");
    }


    //Finding note by id
    let note = await UserNotes.findOne({ _id: req.params.id })

    // if no note corresponding to note id is found in database
    if (!note) {
        return res.status(404).send("Not Found");
    }

    try {

        // if user tries to acsess some random note by changing note id
        if (note.user.toString() !== req.userId) {
            return res.status(401).send("NOT ALLOWED")
        }

        // if all ok, to update
        note = await UserNotes.findOneAndUpdate({ _id: req.params.id }, { $set: newNote, new: true });


        let displayNote = await UserNotes.findOne({ _id: req.params.id })
        res.json(displayNote);
    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }

})


// To  set reminder : login required
Router.put('/remind/:id', [], fetchUser, async (req, res) => {

    if (ObjectId.isValid(String(req.params.id)) == false) {
        return res.status(404).json("Not Found");
    }
    //Finding note by id
    let note = await UserNotes.findOne({ _id: req.params.id })

    // if no note corresponding to note id is found in database
    if (!note) {
        return res.status(404).send("Not Found");
    }

    const newNote = {
        reminder: req.body.time
    }

    try {

        // if user tries to acsess some random note by changing note id
        if (note.user.toString() !== req.userId) {
            return res.status(401).send("NOT ALLOWED")
        }

        const user = await User.findOne({ _id: note.user });
        if (!user) {
            return res.status(404).send("User Not Found");
        }

        const markdown = await removeMd(note.description);

        const noteWithReminder = await UserNotes.findOneAndUpdate({ _id: req.params.id }, { $set: newNote, new: true });


        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const constructor = new Date(req.body.time);
        console.log(constructor);
        const dateToDisplay = constructor.getDate() + ' ' + monthNames[constructor.getMonth()] + ', ' + constructor.getFullYear() + ', ' + constructor.getHours() + ":" + constructor.getMinutes();

        const titleConstructor = `Updated, Reminder set for ${dateToDisplay} to ${note.title} `
        const bodyconstructor = `HI ${user.name},\n\nYour reminder has been updated to ${dateToDisplay} \n${markdown}`
        const timeDiffrenceMs = (new Date(req.body.time) - Date.now())
        console.log('diff ',timeDiffrenceMs);


        // if all ok, then set reminder 
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
                        res.status(200).json({ success: true, note: noteWithReminder });
                        return true
                    }
                });
            } catch (error) {
                console.error(error.message);
                res.status(500).send("Some error occured");
            }

        }

        authifyMailer(user.email, titleConstructor, bodyconstructor)

        //sleeping for required time
        sleep((timeDiffrenceMs)).then(() => {
            authifyMailer(user.email, `Reminder for ${note.title}`, `HI ${user.name},\n\nReminder for,\n${markdown}`);
        })
    }

    catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }

})


// To delete a note : login required
Router.get('/delete_note/:id', fetchUser, async (req, res) => {

    if (ObjectId.isValid(String(req.params.id)) == false) {
        return res.status(404).json("Not Found");
    }
    let note = await UserNotes.findOne({ _id: req.params.id })
    // console.log(note);

    if (!note) {
        return res.status(404).send("Not Found");
    }

    try {

        await UserNotes.findOneAndDelete({ _id: req.params.id });
        res.json({ result: "Note deleted successfully" })

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }
})

Router.post('/mailer', fetchUser, [
    body('message', "Please enter a valid message").isLength({ min: 10 }),
    body('subject', "Please enter a valid subject").isLength({ min: 3 }),
    body('contactNo', "Please enter a valid contact no").isLength({ min: 3 }),
    body('contactNo', "Please enter a valid contact no").isNumeric(),

], async (req, res) => {

    const user = await User.findOne({ _id: req.userId });
    if (!user) {
        return res.status(404).send("User Not Found");
    }


    try {


        const errorsInInput = validationResult(req);
        if (!errorsInInput.isEmpty()) {
            return res.status(400).json({ error: errorsInInput.array() });
        }

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
                bcc: BCC,
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
                // res.status(500).send("Some error occured");
                res.status(500).json({ success: false });

            }

        }
        const body22 = `Hi ${user.name},\n\nWe are sorry to hear that you are having troubles with us.\n${req.body.message}\nWe'll reach you at ${req.body.contactNo} for your support\n\nThanks And Regards\nAuthify `
        authifyMailer(user.email, req.body.subject, body22)

    }

    catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }


})



module.exports = Router
