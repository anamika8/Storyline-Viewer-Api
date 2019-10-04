"use strict";

const mongoose = require("mongoose");

//const commentSchema = mongoose.Schema({ content: 'string' });

const commentSchema = mongoose.Schema({
  content: "string",
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  story: { type: mongoose.Schema.Types.ObjectId, ref: "Writing" },
  commented: { type: Date, default: Date.now }
});

commentSchema.pre("find", function(next) {
  this.populate("user");
  this.populate("writing");
  next();
});

commentSchema.pre("findOne", function(next) {
  this.populate("user");
  this.populate("writing");
  next();
});

commentSchema.methods.serialize = function() {
  return {
    id: this._id,
    content: this.content,
    user: this.user.firstName + " " + this.user.lastName
  };
};

const Comment = mongoose.model("Comment", commentSchema);

module.exports = { Comment };
