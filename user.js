var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    username: String,
    password: String
})

module.exports = userSchema;
