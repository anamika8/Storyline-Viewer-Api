'use strict';
const express = require('express');
const passport = require('passport');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
// Step 1 - impor the user model
const { User } = require('../users');

const config = require('../config');
const router = express.Router();

const createAuthToken = function (user) {
  return jwt.sign({ user }, config.JWT_SECRET, {
    subject: user.email,
    expiresIn: config.JWT_EXPIRY,
    algorithm: 'HS256'
  });
};

const localAuth = passport.authenticate('local', { session: false });
router.use(bodyParser.json());
// The user provides a email and password to login
router.post('/login', localAuth, (req, res) => {
  const authToken = createAuthToken(req.user.serialize());
  // step 2 - find ethe user based on req.user

  User.findOne({ _id: req.user._id })
    .then(user => {
      user.lastLogin = Date.now();
      user.save();
    })
    .catch(e => console.error(e));

  res.json({ authToken });
});

const jwtAuth = passport.authenticate('jwt', { session: false });

// The user exchanges a valid JWT for a new one with a later expiration
router.post('/refresh', jwtAuth, (req, res) => {
  const authToken = createAuthToken(req.user);
  res.json({ authToken });
});

module.exports = { router };
