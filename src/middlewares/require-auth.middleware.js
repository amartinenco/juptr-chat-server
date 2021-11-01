const NotAuthorizedError = require('../errors/not-authorized.error');
const currentUser = require('./current-user.middleware');

const requireAuth = (req, res, next) => {
    
    console.log(req.currentUser);

    if (!req.currentUser) {
        throw new NotAuthorizedError();
        //next();
    }

    next();
}

module.exports = requireAuth;