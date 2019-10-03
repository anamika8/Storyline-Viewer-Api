"use strict";

const chai = require("chai");
const chaiHttp = require("chai-http");

const { app, runServer, closeServer } = require("../server");
const { Story } = require("../storys");
const { User } = require("../users");
const { TEST_DATABASE_URL } = require("../config");

const faker = require("faker");
const mongoose = require("mongoose");

const expect = chai.expect;
chai.use(chaiHttp);

describe("Story endpoints", function() {
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
   * Seeding Storys data
   */
  function seedStorysData() {
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
    return Story.insertMany(seedData);
  }

  function tearDownDb() {
    console.warn("Deleting database");
    return mongoose.connection.dropDatabase();
  }

  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedStorysData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  });

  describe("GET endpoint", function() {
    it("should return all existing storys", function() {
      let post;
      return chai
        .request(app)
        .get("/api/storys")
        .then(function(_post) {
          // so subsequent .then blocks can access response object
          post = _post;
          expect(post).to.have.status(200);
          // otherwise our db seeding didn't work
          expect(post.body.storys).to.have.lengthOf.at.least(1);
          return Story.count();
        })
        .then(function(count) {
          expect(post.body.storys).to.have.lengthOf(count);
        });
    });

    it("should return storys with right fields", function() {
      // Strategy: Get back all storys, and ensure they have expected keys

      let storyPost;
      return chai
        .request(app)
        .get("/api/storys")
        .then(function(post) {
          expect(post).to.have.status(200);
          expect(post).to.be.json;
          expect(post.body.storys).to.be.a("array");
          expect(post.body.storys).to.have.lengthOf.at.least(1);

          post.body.storys.forEach(function(story) {
            expect(story).to.be.a("object");
            expect(story).to.include.keys("id", "title", "user", "content");
          });
          storyPost = post.body.storys[0];
          return Story.findById(storyPost.id);
        })
        .then(function(story) {
          expect(storyPost.id).to.equal(story.id);
          expect(storyPost.title).to.equal(story.title);
          expect(storyPost.user).to.equal(
            story.user.firstName + " " + story.user.lastName
          );
          expect(storyPost.content).to.equal(story.content);
        });
    });
  });

  describe("POST endpoint", function() {
    it("should add a new post in story", function() {
      const newUser = {
        email: faker.internet.email(),
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        password: faker.internet.password()
      };

      User.insertMany(newUser);

      const newStory = {
        title: faker.lorem.sentence(),
        content: faker.lorem.text(),
        // using the user seed data's _id value
        user: newUser.email
      };

      //console.log(newStory);
      return chai
        .request(app)
        .post("/api/storys")
        .send(newStory)
        .then(function(post) {
          expect(post).to.have.status(201);
          expect(post).to.be.json;
          expect(post.body).to.be.a("object");
          expect(post.body).to.include.keys("id", "title", "user", "content");
          // cause Mongo should have created id on insertion
          expect(post.body.id).to.not.be.null;
          expect(post.body.title).to.equal(newStory.title);
          expect(post.body.user).to.equal(
            `${newUser.firstName} ${newUser.lastName}`
          );
          expect(post.body.content).to.equal(newStory.content);
          return Story.findById(post.body.id);
        })
        .then(function(story) {
          expect(newStory.title).to.equal(story.title);
          expect(newStory.content).to.equal(story.content);
          expect(newStory.user).to.equal(story.user.email);
        });
    });
  });

  describe("PUT endpoint", function() {
    it("should update fields in story", function() {
      const updateData = {
        title: "ExampleTitle",
        content: "Example of a bunch of awords"
      };

      return Story.findOne()
        .then(function(story) {
          updateData.id = story.id;

          // make request then inspect it to make sure it reflects
          // data we sent
          return chai
            .request(app)
            .put(`/api/storys/${story.id}`)
            .send(updateData);
        })
        .then(function(post) {
          expect(post).to.have.status(200);

          return Story.findById(updateData.id);
        })
        .then(function(story) {
          expect(story.name).to.equal(updateData.name);
          expect(story.cuisine).to.equal(updateData.cuisine);
        });
    });
  });

  describe("DELETE endpoint", function() {
    it("delete a story post by id", function() {
      let story;

      return Story.findOne()
        .then(function(_story) {
          story = _story;
          return chai.request(app).delete(`/api/storys/${story.id}`);
        })
        .then(function(post) {
          expect(post).to.have.status(204);
          return Story.findById(post.id);
        })
        .then(function(_post) {
          expect(_post).to.be.null;
        });
    });
  });
});
