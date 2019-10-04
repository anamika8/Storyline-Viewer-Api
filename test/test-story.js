"use strict";

const chai = require("chai");
const chaiHttp = require("chai-http");

const { app, runServer, closeServer } = require("../server");
const { Writing } = require("../writings");
const { User } = require("../users");
const { TEST_DATABASE_URL } = require("../config");

const faker = require("faker");
const mongoose = require("mongoose");

const expect = chai.expect;
chai.use(chaiHttp);

describe("Writing endpoints", function() {
  /**
   * Seeding users data
   */
  function seedUsersData() {
    const seedData = [];
    for (let i = 0; i <= 1; i++) {
      seedData.push({
        email: faker.internet.email(),
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        password: faker.internet.password(),
        _id: mongoose.Types.ObjectId()
      });
    }
    // this will return a promise
    User.insertMany(seedData);
    return seedData;
  }

  /**
   * Seeding Writings data
   */
  function seedWritingsData() {
    // first create fake users data
    const userSeedData = seedUsersData();
    const seedData = [];
    for (let i = 0; i <= 1; i++) {
      seedData.push({
        _id: mongoose.Types.ObjectId(),
        title: faker.lorem.sentence(),
        content: faker.lorem.text(),
        // using the user seed data's _id value
        user: userSeedData[i]._id
      });
    }
    return Writing.insertMany(seedData);
  }

  function tearDownDb() {
    console.warn("Deleting database");
    return mongoose.connection.dropDatabase();
  }

  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedWritingsData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  });

  describe("GET endpoint", function() {
    it("should return all existing writings", function() {
      let post;
      return chai
        .request(app)
        .get("/api/writings")
        .then(function(_post) {
          // so subsequent .then blocks can access response object
          post = _post;
          expect(post).to.have.status(200);
          // otherwise our db seeding didn't work
          expect(post.body.writings).to.have.lengthOf.at.least(1);
          return Writing.count();
        })
        .then(function(count) {
          expect(post.body.writings).to.have.lengthOf(count);
        });
    });

    it("should return writings with right fields", function() {
      // Strategy: Get back all writings, and ensure they have expected keys

      let writingPost;
      return chai
        .request(app)
        .get("/api/writings")
        .then(function(post) {
          expect(post).to.have.status(200);
          expect(post).to.be.json;
          expect(post.body.writings).to.be.a("array");
          expect(post.body.writings).to.have.lengthOf.at.least(1);

          post.body.writings.forEach(function(writing) {
            expect(writing).to.be.a("object");
            expect(writing).to.include.keys("id", "title", "user", "content");
          });
          writingPost = post.body.writings[0];
          return Writing.findById(writingPost.id);
        })
        .then(function(writing) {
          expect(writingPost.id).to.equal(writing.id);
          expect(writingPost.title).to.equal(writing.title);
          expect(writingPost.user).to.equal(
            writing.user.firstName + " " + writing.user.lastName
          );
          expect(writingPost.content).to.equal(writing.content);
        });
    });
  });

  describe("POST endpoint", function() {
    it("should add a new post in writing", function() {
      const newUser = {
        email: faker.internet.email(),
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        password: faker.internet.password()
      };

      User.insertMany(newUser);

      const newWriting = {
        title: faker.lorem.sentence(),
        content: faker.lorem.text(),
        // using the user seed data's _id value
        user: newUser.email
      };

      //console.log(newWriting);
      return chai
        .request(app)
        .post("/api/writings")
        .send(newWriting)
        .then(function(post) {
          expect(post).to.have.status(201);
          expect(post).to.be.json;
          expect(post.body).to.be.a("object");
          expect(post.body).to.include.keys("id", "title", "user", "content");
          // cause Mongo should have created id on insertion
          expect(post.body.id).to.not.be.null;
          expect(post.body.title).to.equal(newWriting.title);
          expect(post.body.user).to.equal(
            `${newUser.firstName} ${newUser.lastName}`
          );
          expect(post.body.content).to.equal(newWriting.content);
          return Writing.findById(post.body.id);
        })
        .then(function(writing) {
          expect(newWriting.title).to.equal(writing.title);
          expect(newWriting.content).to.equal(writing.content);
          expect(newWriting.user).to.equal(writing.user.email);
        });
    });
  });

  describe("PUT endpoint", function() {
    it("should update fields in writing", function() {
      const updateData = {
        title: "ExampleTitle",
        content: "Example of a bunch of awords"
      };

      return Writing.findOne()
        .then(function(writing) {
          updateData.id = writing.id;

          // make request then inspect it to make sure it reflects
          // data we sent
          return chai
            .request(app)
            .put(`/api/writings/${writing.id}`)
            .send(updateData);
        })
        .then(function(post) {
          expect(post).to.have.status(200);

          return Writing.findById(updateData.id);
        })
        .then(function(writing) {
          expect(writing.name).to.equal(updateData.name);
          expect(writing.cuisine).to.equal(updateData.cuisine);
        });
    });
  });

  describe("DELETE endpoint", function() {
    it("delete a writing post by id", function() {
      let writing;

      return Writing.findOne()
        .then(function(_writing) {
          writing = _writing;
          return chai.request(app).delete(`/api/writings/${writing.id}`);
        })
        .then(function(post) {
          expect(post).to.have.status(204);
          return Writing.findById(post.id);
        })
        .then(function(_post) {
          expect(_post).to.be.null;
        });
    });
  });
});
