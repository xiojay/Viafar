const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    country: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    writtenText: {
        type: String,
    },
    photos: [String],
    video: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reviews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review'
    }]
});

module.exports = mongoose.model('Post', postSchema);
