const express = require('express');
const Router = express.Router();
const fetchUser = require('../middleware/fetchUserFromToken')
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
var nodemailer = require('nodemailer');
const User = require('../models/User')
const TODO = require('../models/TODO')
var ObjectId = require('mongoose').Types.ObjectId;


// to get all reminders :login will be required 
Router.get('/fetch_all_list', fetchUser, async (req, res) => {
    try {
        const reminders = await TODO.find({ user: req.userId });
        res.json(reminders);
    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }

})


Router.put('/update_existing_list/:id', [], fetchUser, async (req, res) => {
    //Creating new note object
    if (ObjectId.isValid(String(req.params.id)) == false) {
        return res.status(404).json("Not Found");
    }

    //Finding note by id
    const reminder = await TODO.findOne({ _id: req.params.id })

    // if no note corresponding to note id is found in database
    if (!reminder) {
        return res.status(404).send("Not Found");
    };

    try {
        let newReminder = {};


        const user = await User.findOne({ _id: req.userId });
        if (!user) {
            return res.send(400).send("User Not Found")
        };

        // if user tries to acsess some random note by changing note id
        if (reminder.user.toString() !== req.userId) {
            return res.status(401).send("NOT ALLOWED")
        };

        if (reminder.isDone === false) {
            newReminder = { isDone: true };
        }
        else {
            newReminder = { isDone: false };
        }

        // if all ok, to update
        newReminder = await TODO.findOneAndUpdate({ _id: req.params.id }, { $set: newReminder, new: true });
        let displayReminder = await TODO.findOne({ _id: req.params.id })
        res.json(displayReminder);

    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }

})





// To  set reminder : login required
Router.post('/add_list', [
    body('title', "Please enter a valid title").isLength({ min: 3 }),
    body('date', "Please enter a valid title").isLength({ min: 5 }),
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
        const reminder = new TODO({
            user: req.userId,
            title: req.body.title,
            date: new Date(req.body.date),
        })

        const savedReminder = await reminder.save();
        res.json(savedReminder);
    }
    catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }

})


// To delete a reminder : login required
Router.get('/delete_list/:id', fetchUser, async (req, res) => {

    if (req.params.id == undefined || req.params.id == null) {
        return res.status(404).json("Not Found");
    }
    if (ObjectId.isValid(String(req.params.id)) == false) {
        return res.status(404).json("Not Found");
    }

    let reminder = await TODO.findOne({ _id: req.params.id })

    if (!reminder) {
        return res.status(404).send("Not Found");
    }

    try {
        await TODO.findOneAndDelete({ _id: req.params.id });
        res.json({ result: "Reminder deleted successfully" })

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }
})




module.exports = Router
