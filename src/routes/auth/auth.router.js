const {body, checkSchema, validationResult} = require('express-validator');
const express = require('express');
const {  signUpSchema, signUp, signInSchema, signIn, signout, loggedInUser } = require('./auth.controller');
const dbDependent = require('../../middlewares/db-dependent.middleware');
const currentUser = require('../../middlewares/current-user.middleware');

const authRouter = express.Router();

authRouter.post('/signup', dbDependent,
    checkSchema(signUpSchema), 
    signUp
);

authRouter.post('/signin', dbDependent,
    checkSchema(signInSchema),
    signIn
);

authRouter.post('/signout', signout);

authRouter.get('/currentuser', currentUser, loggedInUser);

module.exports = authRouter;