const express = require('express');
const Router = express.Router();
const fetchUser = require('../middleware/fetchUserFromToken')
const userNotes = require('../models/UserNotes');
const { body, validationResult } = require('express-validator');
const UserNotes = require('../models/UserNotes');
const mongoose = require('mongoose');


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


// To delete a note : login required
Router.get('/delete_note/:id', fetchUser, async (req, res) => {

    let note = await UserNotes.findOne({ _id: req.params.id })
    // console.log(note);

    if (!note) {
        return res.status(404).send("Not Found");
    }

    try {

        await UserNotes.findOneAndDelete({_id: req.params.id});
        res.json({result : "Note deleted successfully"})

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Some error occured");
    }
})




module.exports = Router
