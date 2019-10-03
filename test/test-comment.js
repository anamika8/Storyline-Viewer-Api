"use strict";

const chai = require("chai");
const chaiHttp = require("chai-http");

const { app, runServer, closeServer } = require("../server");
const { Story } = require("../storys");
const { User } = require("../users");
const { Comment } = require("../comments");
const { TEST_DATABASE_URL } = require("../config");

const faker = require("faker");
const mongoose = require("mongoose");

const expect = chai.expect;
chai.use(chaiHttp);

describe("Comment section", function() {
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
   * Seeding storys data
   */
  function seedStorysData() {
    const seedData = [];
    for (let i = 0; i <= 1; i++) {
      seedData.push({
        title: faker.lorem.sentence(),
        _id: mongoose.Types.ObjectId()
      });
    }
    // this will return a promise
    Story.insertMany(seedData);
    return seedData;
  }

  /**
   * Seeding Comments data
   */
  function seedCommentsData() {
    // first create fake users data
    const userSeedData = seedUsersData();
    const storysSeedData = seedStorysData();
    const seedData = [];
    for (let i = 0; i <= 1; i++) {
      seedData.push({
        _id: mongoose.Types.ObjectId(),
        content: faker.lorem.text(),
        // using the user seed data's _id value
        user: userSeedData[i]._id,
        // using the story seed data's _id value
        story: storysSeedData[i]._id
      });
    }
    return Comment.insertMany(seedData);
  }

  function tearDownDb() {
    console.warn("Deleting database");
    return mongoose.connection.dropDatabase();
  }

  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedCommentsData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  });

  describe("GET endpoint", function() {
    it("should return all existing comments", function() {
      let remark;
      return chai
        .request(app)
        .get("/api/comments")
        .then(function(_remark) {
          // so subsequent .then blocks can access response object
          remark = _remark;
          expect(remark).to.have.status(200);
          // otherwise our db seeding didn't work
          expect(remark.body.comments).to.have.lengthOf.at.least(1);
          return Comment.count();
        })
        .then(function(count) {
          expect(remark.body.comments).to.have.lengthOf(count);
        });
    });

    it("should return comments with right fields", function() {
      // Strategy: Get back all comments, and ensure they have expected keys

      let commentContent;
      return chai
        .request(app)
        .get("/api/comments")
        .then(function(remark) {
          expect(remark).to.have.status(200);
          expect(remark).to.be.json;
          expect(remark.body.comments).to.be.a("array");
          expect(remark.body.comments).to.have.lengthOf.at.least(1);

          remark.body.comments.forEach(function(comment) {
            expect(comment).to.be.a("object");
            expect(comment).to.include.keys("id", "content", "user");
          });
          commentContent = remark.body.comments[0];
          return Comment.findById(commentContent.id);
        })
        .then(function(Comment) {
          expect(commentContent.id).to.equal(Comment.id);
          expect(commentContent.content).to.equal(Comment.content);
          expect(commentContent.user).to.equal(
            Comment.user.firstName + " " + Comment.user.lastName
          );
        });
    });
  });

  describe("POST endpoint", function() {
    it("user should be able to add a comment to its own story", function() {
      const newUser = {
        email: faker.internet.email(),
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        password: faker.internet.password()
      };

      User.insertMany(newUser);

      const newStory = {
        title: faker.lorem.sentence(),
        _id: mongoose.Types.ObjectId()
      };

      Story.insertMany(newStory);

      const newComment = {
        content: faker.lorem.text(),
        // using the user seed data's _id value
        user: newUser.email,
        // using the story seed data's _id value
        story: newStory._id
      };

      //console.log(newComment);
      return chai
        .request(app)
        .post("/api/comments")
        .send(newComment)
        .then(function(remark) {
          expect(remark).to.have.status(201);
          expect(remark).to.be.json;
          expect(remark.body).to.be.a("object");
          expect(remark.body).to.include.keys("id", "content", "user");
          // cause Mongo should have created id on insertion
          expect(remark.body.id).to.not.be.null;
          expect(remark.body.content).to.equal(newComment.content);
          expect(remark.body.user).to.equal(
            `${newUser.firstName} ${newUser.lastName}`
          );
          return Comment.findById(remark.body.id);
        })
        .then(function(comment) {
          expect(newComment.content).to.equal(comment.content);
          expect(newComment.user).to.equal(comment.user.email);
        });
    });

    it("a different user should be able to add a comment in story", function() {
      // user who will make the comment
      const userGivingComment = {
        email: faker.internet.email(),
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        password: faker.internet.password()
      };

      User.insertMany(userGivingComment);
      // user will create the story post
      const userWritingStory = {
        email: faker.internet.email(),
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        password: faker.internet.password()
      };

      User.insertMany(userWritingStory);

      const newStory = {
        title: faker.lorem.sentence(),
        _id: mongoose.Types.ObjectId(),
        user: userWritingStory._id
      };

      Story.insertMany(newStory);

      const newComment = {
        content: faker.lorem.text(),
        // using the user seed data's _id value
        user: userGivingComment.email,
        // using the story seed data's _id value
        story: newStory._id
      };

      //console.log(newComment);
      return chai
        .request(app)
        .post("/api/comments")
        .send(newComment)
        .then(function(remark) {
          expect(remark).to.have.status(201);
          expect(remark).to.be.json;
          expect(remark.body).to.be.a("object");
          expect(remark.body).to.include.keys("id", "content", "user");
          // cause Mongo should have created id on insertion
          expect(remark.body.id).to.not.be.null;
          expect(remark.body.content).to.equal(newComment.content);
          expect(remark.body.user).to.equal(
            `${userGivingComment.firstName} ${userGivingComment.lastName}`
          );
          return Comment.findById(remark.body.id);
        })
        .then(function(comment) {
          expect(newComment.content).to.equal(comment.content);
          expect(newComment.user).to.equal(comment.user.email);
        });
    });
  });
});
