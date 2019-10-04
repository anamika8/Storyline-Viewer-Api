"use strict";

const mongoose = require("mongoose");

const writingSchema = mongoose.Schema({
  title: "string",
  content: "string",
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  posted: { type: Date, default: Date.now },
  updated: { type: Date }
});

writingSchema.pre("find", function(next) {
  this.populate("user");
  next();
});

writingSchema.pre("findOne", function(next) {
  this.populate("user");
  next();
});

writingSchema.methods.serialize = function() {
  return {
    id: this._id,
    title: this.title,
    content: this.content,
    user: this.user.firstName + " " + this.user.lastName,
    posted: this.posted,
    updated: this.updated
  };
};

const Writing = mongoose.model("Writing", writingSchema);

module.exports = { Writing };
