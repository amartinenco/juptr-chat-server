const jwt = require('jsonwebtoken');

const handleSocketConnections = (io) => {

  io.use((socket, next) => {
    console.log(socket.request.headers.cookie);
    if (socket.request.headers.cookie) {
      try {
        let cookie = socket.request.headers.cookie;
        let cookieValue = cookie.split('=');
        let base64Jwt = (cookieValue[1])? cookieValue[1] : null;
  
        let b64jwt = new Buffer.from(base64Jwt, 'base64');
        let token = JSON.parse(b64jwt);

        const payload = jwt.verify(
          token.jwt, 
          process.env.JWT_KEY
        );
        let userData = {};
        userData = Object.assign(userData, payload);
        if (userData.id && userData.displayName) {
          next();
        } else {
          console.log('unauthorized1');
          next(new Error("unauthorized1"));
        }
      }
      catch (error) {
        console.log('unauthorized2');
        next(new Error("unauthorized2"));
      }
    } else {
      console.log('unauthorized3');
      next(new Error("unauthorized3"));
    }
  });

  io.on("connection", (socket) => {
    const givenSessionId = socket.request.headers.cookie
    console.log('connected', socket.id);
  });
}

module.exports = {
  handleSocketConnections
}