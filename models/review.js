const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    }
});

module.exports = mongoose.model('Review', reviewSchema);
