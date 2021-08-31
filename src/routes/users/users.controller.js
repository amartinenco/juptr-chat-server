const { validationResult } = require('express-validator');
const UserModel = require('../../models/User');

const userRegistrationSchema = {
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
        // custom: {
        //     options: (value, { req, location, path }) => {
        //         return new Promise((resolve, reject) => {
        //             UserModel.findOne({email:req.body.email}, function(err, user){
        //               if(err) {
        //                 reject(new Error('Service Unavailable'))
        //               }
        //               if(Boolean(user)) {
        //                 reject(new Error('E-mail already in use'))
        //               }
        //               resolve(true)
        //             });
        //         });
        //     },
        // },
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
        isStrongPassword: {
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

const userSignUp = (req, res) => {
    console.log(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    res.send('Passed');
}

module.exports = {
    userRegistrationSchema,
    userSignUp
}