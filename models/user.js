const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'post' }],
})

const user = mongoose.model('user', userSchema)
module.exports = user

