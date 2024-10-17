const mongoose = require('mongoose');
const reviewSchema = require('./review').schema

const postSchema = new mongoose.Schema({
  country: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  timeOfYear: {
    type: Date,
    required: true
  },
  reviews: [reviewSchema],
});

const post = mongoose.model('post', postSchema)
module.exports = post
