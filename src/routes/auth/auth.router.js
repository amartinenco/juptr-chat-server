const {body, checkSchema, validationResult} = require('express-validator');
const express = require('express');
const {  signUpSchema, signUp, signInSchema, signIn } = require('./auth.controller');
const dbDependent = require('../../middlewares/db-dependent.middleware');

const authRouter = express.Router();

authRouter.post('/signup', dbDependent,
    checkSchema(signUpSchema), 
    signUp
);

authRouter.post('/signin', dbDependent,
    checkSchema(signInSchema),
    signIn
);

module.exports = authRouter;