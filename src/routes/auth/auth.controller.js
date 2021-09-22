const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { validationResult } = require('express-validator');
const User = require('../../models/User');

const JWT_KEY = process.env.JWT_KEY;

const signUpSchema = {
    email: {
        trim: true,
        isEmail: {
            errorMessage: 'The email is invalid',
            bail: true,
        },
        normalizeEmail: true,
        isLength: { 
            errorMessage: 'Email is too long',
            options: {
                max: 254
            }
        },
        custom: {
            options: (value, { req, location, path }) => {
                return new Promise((resolve, reject) => {
                    User.findOne({ email:value }, function(err, user){        
                      if(err) {
                        reject(new Error('Service Unavailable'))
                      }
                      if(Boolean(user)) {
                        reject(new Error('E-mail already in use'))
                      }
                      resolve(true)
                    });
                });
            },
        }
    },
    displayName: {
        trim: true,
        escape: true,
        isLength: {
            errorMessage: 'Display Name must be between 6 and 64 characters long',
            options: {
                min: 6, 
                max: 30
            }
        },
        matches: {
            errorMessage: 'Display name must have characters, numbers, non consecutive dots, underscores.',
            options: /^(?!\.)(?!.*\.$)(?!.*?\.\.)(?=.*[a-zA-Z])[a-zA-Z0-9_.]+$/
        },
        custom: {
            options: (value, { req, location, path }) => {
                return new Promise((resolve, reject) => {
                    User.findOne({ displayName:value }, function(err, user){        
                      if(err) {
                        reject(new Error('Service Unavailable'))
                      }
                      if(Boolean(user)) {
                        reject(new Error('Display name is already in use'))
                      }
                      resolve(true)
                    });
                });
            },
        }
    },
    fullName: {
        optional: { options: { nullable: true } },
        trim: true,
        escape: true,
        isLength: {
            errorMessage: 'Full Name is too long',
            options: {
                max: 100
            }
        },
        matches: {
            errorMessage: 'Full Name must have only alphabetical characters and no extra spaces',
            options: /^(?!\s)(?!\s*\s$)(?!.*?\s\s)[a-zA-Z\s]*$/
        }
    }, 
    password: {
        isLength: {
            minLength: 8
        },
        errorMessage: "Password must be greater than 8 characters",
    },
    confirmPassword: {
        custom: {
            options: (value, { req, location, path }) => {
                if (value !== req.body.password) {
                    throw new Error('Password confirmation does not match password');
                }
                return true;
            },
        },
    }
};

const signInSchema = {
    email: {
        trim: true,
        isEmail: {
            errorMessage: 'Invalid credentials',
            bail: true,
        },
        normalizeEmail: true,
        isLength: { 
            errorMessage: 'Invalid credentials',
            options: {
                max: 254
            }
        }
    },
    password: {
        isLength: {
            minLength: 8
        },
        errorMessage: "Invalid credentials",
        custom: {
            options: (enteredPassword, { req, location, path }) => {
                const { email } = req.body;
                return new Promise((resolve, reject) => {
                    User.findOne({ email: email }, function(err, user){        
                        if(err) {
                            reject(new Error('Service Unavailable'));
                        }
                        if(Boolean(user)) {  
                            bcrypt.compare(enteredPassword, user.password, (err, res) => {
                                if (err) {
                                    reject(new Error('Service Unavailable'));
                                }
                                
                                if (res) {
                                    // Generate JWT
                                    const userJwt = jwt.sign({
                                        id: user.id,
                                        displayName: user.displayName,
                                        email: user.email,
                                        fullName: user.fullName
                                    }, JWT_KEY);

                                    // Store JWT on a session object
                                    req.session = {
                                        jwt: userJwt
                                    };
                                    req.body.user = user;
                                    resolve(true);
                                } else {
                                    reject(new Error('Invalid credentials'));
                                }
                            });
                        } else {
                            reject(new Error('Invalid credentials'));
                        }
                    });
                });
            },
        }
    }
};


const signIn = async (req, res) => {

    const errors = validationResult(req).formatWith(({ msg, param, value }) => ({
        msg
    }));
    
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: [errors.array()[0]] });
    }

    const { user } = req.body;

    res.status(200).send(user);
}

const signUp = async (req, res) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 12);

    const user = new User({
        email: req.body.email,
        displayName: req.body.displayName,
        fullName: req.body.fullName,
        password: hashedPassword
    });

    await user.save();

    // Generate JWT
    const userJwt = jwt.sign({
        id: user.id,
        displayName: user.displayName,
        email: user.email
    }, JWT_KEY);

    // Store JWT on a session object
    req.session = {
        jwt: userJwt
    };

    res.status(201).send(user);
}

const signout = (req, res) => {
    req.session = null;
    res.send({});
}

const loggedInUser = (req, res) => {
    res.send({ currentUser: (req.currentUser)? req.currentUser : null });
}

module.exports = {
    signUpSchema,
    signUp,
    signInSchema,
    signIn,
    signout,
    loggedInUser
}