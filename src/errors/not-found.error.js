const CustomError = require('./custom.error');

class NotFoundError extends CustomError {
    
    constructor() {
        super('Route not found', 404);
    }
}

module.exports = NotFoundError;