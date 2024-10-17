const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 0,
    max: 4
  },
});

const review = mongoose.model('review', reviewSchema)
module.exports = review
