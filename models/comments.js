const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true
  },
  comment: {
    type: String,
    required: true,
  },
  transportNumber: {
    type: String,
  },
  stopName: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: () => Date.now()
  }
});

const Comment = mongoose.model("Comment", CommentSchema);

module.exports = Comment;