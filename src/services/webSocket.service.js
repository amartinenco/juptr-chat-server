const jwt = require('jsonwebtoken');
const BROADCAST = require('../types/broadcast.types');

let connected_peers = {};
let reverseSocketToUser = {};

const handleSocketConnections = (io) => {

  io.use((socket, next) => {
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
          next(new Error("unauthorized"));
        }
      }
      catch (error) {
        next(new Error("unauthorized"));
      }
    } else {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on('register-new-user', (data) => {
      if (data.displayName && data.socketId) {
        connected_peers[data.displayName] = {
          socketId: data.socketId,
          fullName: data.fullName
        };
        reverseSocketToUser[data.socketId] = data.displayName;
      }
      io.sockets.emit('broadcast', { 
        event: BROADCAST.ACTIVE_USERS,
        activeUsers: (connected_peers)? Object.getOwnPropertyNames(connected_peers) : []
      });
    });
    socket.on('disconnect', () => {
      let userToDisconnect = reverseSocketToUser[socket.id];
      if (userToDisconnect) {
        console.log('Disconnecting', connected_peers[userToDisconnect]);
        delete connected_peers[userToDisconnect];
      }
      io.sockets.emit('broadcast', { 
        event: BROADCAST.ACTIVE_USERS,
        activeUsers: (connected_peers)? Object.getOwnPropertyNames(connected_peers) : []
      });
    });
  });
}

module.exports = {
  handleSocketConnections
}