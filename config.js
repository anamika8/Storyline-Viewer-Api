"use strict";
exports.DATABASE_URL =
  process.env.DATABASE_URL || "mongodb://localhost/storyline-viewer-api";
exports.TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "mongodb://localhost/test-storyline-viewer-api";
exports.PORT = process.env.PORT || 8083;
