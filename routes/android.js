var express = require('express');
const axios = require('axios')
const fs = require('fs/promises');
const cs = require('./client_secret.json')
const config = require('dotenv')
const mongoose = require("mongoose");
const userModel = require("../models/users")
const commentModel = require("../models/comments")

/**
 * @swagger
 * tags:
 *   name: BoT API's
 *   description: Android API's for BoT
 * /api/android/get-token:
 *   get:
 *     summary: Lists all the books
 *     tags: [Token]
 *     responses:
 *          200:
 *              description: Token was retrieved successfully
 *          500:
 *              description: Some error occured
 * /api/android/user/create:
 *   post:
 *     summary: Create a user in the DB with details from google
 *     tags: [User]
 *     responses:
 *          200:
 *              description: User created succesfully
 *          500:
 *              description: Some error occured
 * /api/android/user/check/{email}:
 *   get:
 *     summary: Check if user with email exists
 *     tags: [User]
 *     responses:
 *          200:
 *              description: Data recieved succesfully
 *          404:
 *              description: No user found
 *          500:
 *              description: Some error occured
 * /api/android/user/home/check/{email}:
 *   get:
 *     summary: Check if user with email has a home address
 *     tags: [User]
 * /api/android/user/calender/add:
 *   post:
 *     summary: Create a Calender for the User
 *     tags: [User, Calender]
 * /api/android/calender/event/create:
 *   post:
 *     summary: Create an event in the Calender for a user
 *     tags: [User, Calender]
 * /api/android/user/calender/event:
*    post:
 *     summary: Create an event in the Calender for a user
 *     tags: [User, Calender]
 */


mongoose.set("strictQuery", false);

// const bot_uri = "http://localhost:3000"
//  const bot_uri = "https://bo-t-backend.vercel.app"
const bot_uri = "https://frantic-costume-crow.cyclic.app"

const db_uri = "mongodb+srv://amalakar:uI4W9lZLqpJ28eqL@bot-app.2jqsty0.mongodb.net"


var router = express.Router();

/* GET home page. */
router.get('/get-token', function(req, res, next) {
    const id_token = req.query.token
    cs['code'] = id_token
    axios.post('https://accounts.google.com/o/oauth2/token', {
        'code': cs.code,
        'client_id': cs.web.client_id,
        'client_secret': cs.web.client_secret,
        'redirect_uri': bot_uri,
        'grant_type': 'authorization_code',
    }).then(result => {
        // res.cookie('refresh_token', result.data.a)
        // console.log(result)
        return res.send({
            access_token: result.data.access_token,
            scope: result.data.scope,
            expires_in: result.data.expires_in,
            token_type: result.data.token_type,
            id_token: result.data.id_token,
            refresh_token: result.data.refresh_token
        })
    }).catch(err => {
        console.log(err)
    })
    // res.render('index', { title: 'Express' });
});

router.post('/user/create', async function(req,res,next){
    // console.log(process.env.DB_URI)
    await mongoose.connect(
    `${db_uri}/bot_app`
    );

    const user = new userModel(req.body);
    try {
      userData = await user.save().then(res => {
        return res
      }).catch(err => {
        console.log(err)
      })
      return res.send(userData)
    } catch (error) {
        console.log(error)
      res.status(500).send(error);
    }
})

router.get('/user/check/:email', async function(req, res, next) {
    // console.log(process.env.DB_URI)
    await mongoose.connect(
        `${db_uri}/bot_app`
    );

    const email = req.params.email;

    try {
        const user = await userModel.findOne({ email: email });
        if (user) {
            return res.send({ message: "User found" });
        } else {
            return res.send({ message: "User not found" });
        }
    } catch (error) {
        console.log(error)
        res.status(500).send(error);
    }
})


router.post('/user/calender/add', async function(req, res, next) {
    // console.log(process.env.DB_URI)
    return mongoose.connect(
        `${db_uri}/bot_app`
    ).then(async result => {
        const name = req.body.name
        const email = req.body.email;
        const authorization = req.body.authorization; // Extract the access token from the Authorization header
        try {
            return userModel.findOne({ email: email }).then(async user => {
                if (user) {
                    const savedUser = await axios.get(bot_uri + "/api/android/get-token?token="+authorization).then(token => {
                        return token;
                    })
                    // console.log(savedUser)
                    return res.json({
                        success: true,
                        access_token: savedUser.data.access_token,
                        refresh_token: user.refreshToken
                    });
                } else {
                    // Create a new calendar for the user
                    const calendarData = {
                        summary: `BOT Calendar`
                    };
                    const savedUser = await axios.get(bot_uri + "/api/android/get-token?token="+authorization).then(async token => {
                        console.log(token)
                        const accessToken = token.data.access_token
                        const response = await axios.post(
                            "https://www.googleapis.com/calendar/v3/calendars",
                            calendarData,
                            {
                                headers: {
                                    Authorization: `Bearer ${accessToken}`,
                                },
                            }
                        ).then(calender => {
                            console.log(calender)
                            const calendarId = calender.data.id;
            
                            // Create a new user with the given email and calendarId
                            const newUser = new userModel({
                                name: name,
                                email: email,
                                calenderId: calendarId,
                                refreshToken: token.data.refresh_token
                            });
                            const savedUser = newUser.save();
                            return savedUser;
                        }).catch(err => {
                            console.log(err)
                            res.send({
                                success: false
                            })
                        })
    
                        return token
                    })
                    return res.send({
                        success: true,
                        access_token: savedUser.data.access_token,
                        refresh_token: savedUser.data.refresh_token
                    });
                }
            })
        } catch (error) {
            console.log(error);
            res.status(500).send({
                success: false
            });
        }
    })
});

router.get('/refresh-token/:email', async function(req, res, next) {
    const email = req.params.email
    const details = await mongoose.connect(
        `${db_uri}/bot_app`
    ).then(async result => {
        return userModel.findOne({ email: email })
            .then(async user => {
                console.log(user)
                if(!user){
                    return res.send({
                        success: false
                    })
                }else{
                    await axios.post('https://accounts.google.com/o/oauth2/token', {
                        'refresh_token': user.refreshToken,
                        'client_id': cs.web.client_id,
                        'client_secret': cs.web.client_secret,
                        'redirect_uri': bot_uri,
                        'grant_type': 'refresh_token',
                    }).then(result => {
                        // res.cookie('refresh_token', result.data.a)
                        return res.send({
                            success: true,
                            access_token: result.data.access_token,
                            scope: result.data.scope,
                            expires_in: result.data.expires_in,
                            token_type: result.data.token_type,
                            id_token: result.data.id_token,
                            refresh_token: user.refreshToken
                        })
                    }).catch(err => {
                        console.log(err)
                        return res.send({
                            success: false
                        })
                    })
                }
            }).catch(err => {
                console.log(err)
                return res.send({
                    success: false,
                })
            })
    })

    return res.send(details)
})

router.post('/calender/event/create', function (req,res,next) {
    const accessToken = req.body.access_token;
    const eventData = {
    summary: req.body.summary,
    origin: req.body.origin,
    location: req.body.location,
    description: req.body.description,
    start: {
        // dateTime: new Date(req.body.startDateTime).toISOString(),
        dateTime: req.body.startDateTime,
        timeZone: 'America/New_York'
    },
    end: {
        dateTime: req.body.endDateTime,
        timeZone: 'America/New_York'
    },
    reminders: {
        useDefault: true
    },
    legsData:req.body.legsData,
    duration:req.body.duration,
    distance:req.body.distance,
    // recurrence: [
    //     `RRULE:FREQ=${req.body.repeat};COUNT=13`
    // ],
    };

    // Set up the request options
    const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
    };

    mongoose.connect(
        `${db_uri}/bot_app`
    ).then(async result => {
        const email = req.body.email;
        return userModel.findOne({ email: email }).then(async user => {
            var legsData = []
            var transit_duration = ""
            var start_time = ""
            var arrival_time = ""
            if (user) {
                // console.log(user.calenderId)
                const url = `https://www.googleapis.com/calendar/v3/calendars/${user.calenderId}/events`;
                axios.post(url, eventData, config).then(result => {
                    // console.log(result)
                })
                .then(result => {
                    userModel.findOneAndUpdate(
                        { email: email },
                        { $push: { events: eventData } },
                        { new: true, upsert: true }
                    ).then(updatedUser => {
                        console.log('Event added to the user document:', updatedUser);
                    }).catch(err => {
                        console.log('Error updating user document:', err);
                        return res.send(err)
                    });
                })
                .catch(err => {
                    console.log(err)
                    return res.send(err)
                })
            }
        }).catch(err => {
            console.log(err)
            return res.send(err)
        })
    }).catch(err => {
        console.log(err)
        return res.send(err)
    })

    return res.send({
        msg: "Event created succesfully"
    })
})

router.post('/user/calender/event', async function (req, res) {
    const email = req.body.email;

    mongoose.connect(
        `${db_uri}/bot_app`
    ).then(async result => {
        if (!email) {
            return res.status(400).send("Email is required in the request body");
        }
    
        try {
            const user = await userModel.findOne({ email: email });
    
            if (!user) {
                return res.status(404).send("User not found");
            }
    
            const events = user.events.filter(event => {
                // Check if event is happening today or from today
                const eventDate = new Date(event.start.dateTime);
                const today = new Date();
                today.setDate(today.getDate() - 1);
                return (eventDate >= today);
            }) || [];

            events.sort((a, b) => {
                const dateA = new Date(a.start.dateTime);
                const dateB = new Date(b.start.dateTime);
                return dateA - dateB;
            });

            // const events = user.events || [];
            return res.status(200).json(events);
        } catch (err) {
            console.log(err);
            return res.status(500).send("Internal server error");
        }
    })
    
})


router.post('/user/calender/event/today', async function (req, res) {
    const email = req.body.email;

    mongoose.connect(
        `${db_uri}/bot_app`
    ).then(async result => {
        if (!email) {
            return res.status(400).send("Email is required in the request body");
        }
    
        try {
            const user = await userModel.findOne({ email: email });
    
            if (!user) {
                return res.status(404).send("User not found");
            }
    
            const events = user.events.filter(event => {
                // Check if event is happening today or from today
                // Check if event is happening today or from today
                const eventDate = new Date(event.start.dateTime);

                // Get the current date
                const today = new Date();
                const timeZone = 'America/New_York';

                // Convert the dates to the specified timezone
                const eventDateInNY = new Date(eventDate.toLocaleString('en-US', { timeZone }));
                const todayInNY = new Date(today.toLocaleString('en-US', { timeZone }));
            
                // Compare the date portions of eventDateInNY and todayInNY
                const isToday = eventDate.getDate() === todayInNY.getDate() &&
                                eventDate.getMonth() === todayInNY.getMonth() &&
                                eventDate.getFullYear() === todayInNY.getFullYear();
            
                // Return true if eventDateInNY is in todayInNY, else false
                return isToday;
            }) || [];

            events.sort((a, b) => {
                const dateA = new Date(a.start.dateTime);
                const dateB = new Date(b.start.dateTime);
                return dateA - dateB;
            });

            // const events = user.events || [];
            return res.status(200).json(events);
        } catch (err) {
            console.log(err);
            return res.status(500).send("Internal server error");
        }
    })
    
})

router.post("/user/update/home", async function (req,res,next){
    const userEmail = req.body.email;
    const newHomeAddress = req.body.homeAddress;

    // Update the user's homeAddress field
    const update = await mongoose.connect(
        `${db_uri}/bot_app`
        ).then(async result => {
            await userModel.findOneAndUpdate({ email: userEmail }, { homeAddress: newHomeAddress }, { new: true })
            .then(updatedUser => {
                console.log(`Successfully updated homeAddress for user with email ${userEmail}`);
                console.log(updatedUser);
                return true;
            })
            .catch(error => {
                console.error(`Error updating homeAddress for user with email ${userEmail}`);
                console.error(error);
                return false;
            });
    })

    if(update){
        return res.send("Update complete")
    }else{
        return res.send("Something went wrong")
    }
})


router.get("/user/home/check/:email", async function(req,res,next) {
    const userEmail = req.params.email;

    var address;

    const home = await mongoose.connect(
        `${db_uri}/bot_app`
        ).then(async result => {
        return await userModel.findOne({ email: userEmail })
        .then(user => {
            if (user.homeAddress) {
            console.log(`The homeAddress for user with email ${userEmail} is ${user.homeAddress}`);
                return {
                    success:true,
                    address: user.homeAddress
                }
            } else {
            console.log(`The homeAddress is not present in the database for user with email ${userEmail}`);
                return {
                    success:false,
                }
            }
        })
        .catch(error => {
            console.error(`Error finding user with email ${userEmail}`);
            console.error(error);
            return {
                success:false,
            }
        });
    })

    if(home.success){
        return res.send({
            "success":true,
            "message":"Home address present",
            "address": home.address
        })
    }else{
        return res.send({
            "success":false,
            "message":"Home address not present",
            "address":"N/A"
        })
    }
})

router.post("/transports/comment", async function (req,res,next){
    const userEmail = req.body.email 
    const response = mongoose.connect(`${db_uri}/bot_app`)
        .then(async result => {
            return await userModel.findOne({email: userEmail})
                .then(async user => {
                    if (!user) {
                        return res.status(404).send("User not found");
                    }
                    const comment = new commentModel({
                        userEmail: req.body.email,
                        comment: req.body.comment,
                        transportNumber: req.body.transportNumber,
                        stopName: req.body.stopName
                    })
                    try {
                        commentData = await comment.save().then(res => {
                          return res
                        }).catch(err => {
                          console.log(err)
                        })
                        return res.send(commentData)
                      } catch (error) {
                          console.log(error)
                        res.status(500).send(error);
                      }
                })
        })

    return response;
})

router.get("/transports/comments/all", async function (req, res, next){
    const response = mongoose.connect(`${db_uri}/bot_app`)
    .then(async result => {
        const start = new Date().toDateString();
        return await commentModel.find({createdAt: {$gte : start }}).sort({createdAt: -1}).then(result => {
            return res.send(result)
        })
    })
    return response;
})

router.get("/transports/comments/by-train/:trainNumber", async function (req, res, next){
    const response = mongoose.connect(`${db_uri}/bot_app`)
    .then(async result => {
        const start = new Date().toDateString();
        return await commentModel.find({transportNumber: req.params.trainNumber,createdAt: {$gte : start }}).sort({createdAt: 1}).then(result => {
            return res.send(result)
        })
    })
    return response;
})

router.get("/transports/comments/by-stop/:stop", async function (req, res, next){
    const response = mongoose.connect(`${db_uri}/bot_app`)
    .then(async result => {
        const start = new Date().toDateString();
        return await commentModel.find({stopName: req.params.stop,createdAt: {$gte : start }}).then(result => {
            return res.send(result)
        })
    })

    return response;
})

router.get("/transports/comments/availableNumbers", async function(req,res,next){
    const response = mongoose.connect(`${db_uri}/bot_app`)
    .then(async result => {
        return await commentModel.find().distinct('transportNumber').then(result => {
            return res.send(result)
        })
    })

    return response;
})

router.get("/transports/comments/availableStops", async function(req,res,next){
    const response = mongoose.connect(`${db_uri}/bot_app`)
    .then(async result => {
        return await commentModel.find().distinct('stopName').then(result => {
            return res.send(result)
        })
    })

    return response;
})

router.post("/logout", (req,res,next) => {
    axios.post('https://accounts.google.com/o/oauth2/revoke', null, {
        params: {
            token: req.body.accessToken
        }
    })
    .then(response => {
    console.log('Access token has been revoked');
    res.send("Token revoked")
    })
    .catch(error => {
    console.error('Error revoking access token:', error.response.data);
    res.send("Error")
    });
})


module.exports = router;
