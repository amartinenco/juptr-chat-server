const jwt = require('jsonwebtoken');
const currentUser = require('../middlewares/current-user.middleware');
const BROADCAST = require('../types/broadcast.types');
let connected_peers = {};
let reverseSocketToUser = {};

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
            // // User already logged in from another location
            // let userToKick = connected_peers[userData.displayName].socketId;
            // // console.log(connected_peers);
            // console.log('user to kick', userToKick)
            // console.log('my socket id', socket.id);
            // delete connected_peers[userToKick];
            // const userToKickSocket = await io.in(userToKick).fetchSockets();
            // console.log('userToKickSocketId', userToKickSocket);
            // try {
            //   socket.disconnect(true)
            // } catch (error) {
            //   console.log(error);
            // }
            // // try {
            // //   userToKickSocket.disconnect();
            // // } catch(error) {
            // //   console.log(error);
            // // }
            // // io.sockets.sockets[userToKick].disconnect();
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
        // console.log('Disconnecting',userToDisconnect, connected_peers[userToDisconnect]);
        delete connected_peers[userToDisconnect];
      }
      io.sockets.emit('broadcast', { 
        event: BROADCAST.ACTIVE_USERS,
        payload: (connected_peers)? Object.getOwnPropertyNames(connected_peers) : []
      });
    });

    // WebRTC event listeners
    socket.on('webRTC-offer', (data) => {
      console.log('handlig webrtc offer');
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
      console.log('handling ice candidate');
      let socketId = getUserSocketId(data);
      if (socketId && data.candidate) {
        let callTo = data.name;
        let callFrom = data.target;
        io.to(socketId).emit('webRTC-candidate', {
          name: callFrom,
          target: callTo,
          candidate: data.candidate
        });
      }
    });
    // socket.on('webRTC-answer', (data) => {
    //   console.log('handling webRTC answer');
    //   let socketId = getUserSocketId(data);
    //   if (socketId) {
    //     io.to(socketId).emit('webRTC-answer', {
    //       answer: data.answer
    //     });
    //   }
    // })
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

module.exports = {
  handleSocketConnections,
  disconnectWebSocketUser,
  checkIfUserConnected
};