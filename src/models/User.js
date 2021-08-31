const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    displayName: {
        type: String,
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: false
    },
    password: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('User', userSchema);