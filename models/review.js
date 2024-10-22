const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: false,
        min: 1,
        max: 4
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    }
});

module.exports = mongoose.model('Review', reviewSchema);
