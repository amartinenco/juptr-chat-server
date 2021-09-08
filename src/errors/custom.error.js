class CustomError extends Error {

    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }

    serializeError() {
        return {
            msg: this.message
        }
    }
}

module.exports = CustomError;