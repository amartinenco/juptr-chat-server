const CustomError = require('./custom.error');

class NotAvailableServiceError extends CustomError {
    
    constructor() {
        super('Service is currently unavailable', 503);
    }
}

module.exports = NotAvailableServiceError;