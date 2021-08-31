const {body, checkSchema, validationResult} = require('express-validator');
const express = require('express');
const {  userRegistrationSchema, userSignUp } = require('./users.controller');

const usersRouter = express.Router();

usersRouter.post('/signup', 
    checkSchema(userRegistrationSchema), 
    userSignUp
);

module.exports = usersRouter;