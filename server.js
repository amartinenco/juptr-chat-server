const express = require('express');
const session = require('express-session');
const { body, validationResult } = require('express-validator');
const MongoDBSession = require('connect-mongodb-session')(session);
const mongoose = require('mongoose');
require('dotenv').config();

const UserModel = require('./models/User');

const SERVER_PORT = process.env.PORT || 5000;

const app = express();

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }))

// mongoose.connect(process.env.MONGODB_URI).then((res) => {
//     console.log('MongoDB connected');
// });

// const store = new MongoDBSession({
//     uri: process.env.MONGODB_URI,
//     collection: 'mySessions'
// });

// app.use(session({
//     secret: 'key that will sign a cookie',
//     resave: false,
//     saveUninitialized: false,
//     store: store
// }));

const serverStatus = () => {
    return { 
       state: 'up', 
       dbState: mongoose.STATES[mongoose.connection.readyState] 
    }
};

const dbDependant = (req, res) => {
    if (mongoose.connection.readyState !== 1) {
        res.status(503).send();
    } else {
        next();
    }
}

app.use('/uptime', require('express-healthcheck')({
    healthy: serverStatus
}));

app.post('/signup', dbDependant, 
    body('email').trim().isEmail().normalizeEmail().isLength({ max: 254 })
        .withMessage('The email is invalid.')
        .custom((value, {req})=> {
            return new Promise((resolve, reject) => {
                UserModel.findOne({email:req.body.email}, function(err, user){
                  if(err) {
                    reject(new Error('Service Unavailable'))
                  }
                  if(Boolean(user)) {
                    reject(new Error('E-mail already in use'))
                  }
                  resolve(true)
                });
            });
    }),
    body('displayName').trim().escape().isLength({ min: 6, max: 64 }).matches(/^[a-zA-Z._0-9]*$/)
        .withMessage('Display name can have only characters, numbers, dot, underscore.'),
    body('fullName').optional({nullable: true}).trim().escape().isLength({ max: 100 }).matches(/^[a-zA-Z\s'.,-]*$/)
        .withMessage('Name must not have numbers or special character ex:@$?%'),
    body('password').isLength({ min: 8, max: 254 })
        .withMessage('Password must be at least 8 characters long.'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Password confirmation does not match password');
        }
        return true;
      }),
    (req, res)=> {
        
        // console.log(req.body.email);
        // req.session.isAuth = true;
        // res.send("Hello");
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // let user = await UserModel.findOne({ email });

        // User.create({
        //     username: req.body.username,
        //     password: req.body.password,
        // }).then(user => res.json(user));
        res.send('Passed');
});

app.listen(SERVER_PORT, () => {
    console.log(`Server started at port ${SERVER_PORT}`);
});
