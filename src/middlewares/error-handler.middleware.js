const CustomError = require("../errors/custom.error");

function errorHandler (error, req, res, next) {
    
    if (error instanceof CustomError) {
        return res.status(error.statusCode).send({
            errors: [error.serializeError()]
        });
    }
    
    res.status(400).send({
        errors: [{ message: 'Something went wrong' }]
    });
}

module.exports = errorHandler;