"use strict";

const mongoose = require("mongoose");

const storySchema = mongoose.Schema({
  title: "string",
  content: "string",
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  posted: { type: Date, default: Date.now },
  updated: { type: Date }
});

storySchema.pre("find", function(next) {
  this.populate("user");
  next();
});

storySchema.pre("findOne", function(next) {
  this.populate("user");
  next();
});

storySchema.methods.serialize = function() {
  return {
    id: this._id,
    title: this.title,
    content: this.content,
    user: this.user.firstName + " " + this.user.lastName,
    posted: this.posted,
    updated: this.updated
  };
};

const Story = mongoose.model("Story", storySchema);

module.exports = { Story };
