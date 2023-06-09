const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String
  },
  email: {
    type: String,
    required: true,
  },
  calenderId: {
    type: String,
    required: true,
  },
  refreshToken: {
    type: String,
    required: false
  },
  homeAddress: {
    type: String
  },
  friends: {
    name: {
      type: String
    },
    email: {
      type: String
    },
  },
  events: [
    {
      summary: String,
      location: String,
      description: String,
      start: {
        dateTime: String,
        timeZone: String
      },
      end: {
        dateTime: String,
        timeZone: String
      },
      reminders: {
        useDefault: Boolean
      },
      duration: String,
      distance: String,
      legsData: []
    }
  ]
});

const User = mongoose.model("User", UserSchema);

module.exports = User;