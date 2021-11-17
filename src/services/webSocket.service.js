const jwt = require('jsonwebtoken');
const currentUser = require('../middlewares/current-user.middleware');
const BROADCAST = require('../types/broadcast.types');
let connected_peers = {};
let reverseSocketToUser = {};

let callRequests = {};

let socketIO = null;

const handleSocketConnections = (io) => {
  socketIO = io;
  io.use(async (socket, next) => {
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
          let hasUser = !!connected_peers[userData.displayName];
          if (!hasUser) {
            next();
          } else {
            next(new Error("Another session is currently active"));
          }
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
        payload: (connected_peers)? Object.getOwnPropertyNames(connected_peers) : []
      });
    });
    socket.on('disconnect', () => {
      let userToDisconnect = reverseSocketToUser[socket.id];
      if (userToDisconnect) {
        delete connected_peers[userToDisconnect];
      }
      io.sockets.emit('broadcast', { 
        event: BROADCAST.ACTIVE_USERS,
        payload: (connected_peers)? Object.getOwnPropertyNames(connected_peers) : []
      });
    });

    // WebRTC event listeners
    socket.on('webRTC-offer', (data) => {
      let socketId = getUserSocketId(data);
      if (socketId && data.sdp) {
        let callTo = data.name;
        let callFrom = data.target;
        io.to(socketId).emit('webRTC-offer', {
          name: callFrom,
          target: callTo,
          type: "video-offer",
          sdp: data.sdp
        });
      }
    });
  
    socket.on('webRTC-candidate', (data) => {
      let socketId = getUserSocketId(data);
      if (socketId && data.candidate) {
        let callTo = data.name;
        let callFrom = data.target;
        io.to(socketId).emit('webRTC-candidate', {
          name: callFrom,
          target: callTo,
          type: data.type,
          candidate: data.candidate
        });
      }
    });
    socket.on('webRTC-answer', (data) => {
      let socketId = getUserSocketId(data);
      if (socketId && data.answer) {
        let callTo = data.name;
        let callFrom = data.target;
        io.to(socketId).emit('webRTC-answer', {
          name: callFrom,
          target: callTo,
          answer: data.answer
        });
      }
    });

    socket.on('callAttempt', (data) => {
      let socketId = getUserSocketId(data);
      if (socketId && data.name) { 
        let name = data.target;
        let target = data.name;
        io.to(socketId).emit('callAttempt', {
          name: name,
          target: target,
          type: 'callee'
        }); 
      }
    }); 

    socket.on('callAttemptResponse', (data) => {
      let socketId = getUserSocketId(data);
      if (socketId && data.response && data.name) {
        let name = data.target;
        let target = data.name;
        io.to(socketId).emit('callAttemptResponse', {
          name: name,
          target: target,
          response: data.response
        }); 
      }
    });

  });
}

const disconnectWebSocketUser = (userToDisconnect) => {
  let userToKick = connected_peers[userToDisconnect];
  try {
    let socketToDisconnect = socketIO.sockets.sockets.get(userToKick.socketId);
    socketToDisconnect.disconnect(true);
    delete connected_peers[userToDisconnect];
  } catch (error) {
  }
}

const checkIfUserConnected = (userToCheck) => {
  let user = connected_peers[userToCheck];
  if (user) {
    return true;
  } 
  return false;
}

const getUserSocketId = ({target}) => {
  if (target && (typeof target === 'string') && target.length < 30) { 
    if (connected_peers[target]) {
      return connected_peers[target].socketId
    } 
  }
  return undefined;
}

// const checkIfSomeoneCalled = (id) => {
//   if (id && (typeof id === 'string') && id.length < 30) { 
//     if (callRequests[id]) {
//       return callRequests[id].from;
//     } 
//   }
//   return undefined;
// }

module.exports = {
  handleSocketConnections,
  disconnectWebSocketUser,
  checkIfUserConnected
};