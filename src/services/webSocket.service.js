const jwt = require('jsonwebtoken');
const currentUser = require('../middlewares/current-user.middleware');
const BROADCAST = require('../types/broadcast.types');

const { establishCall, tearDownCallData, getCallDataIfExists, getUserFromBusyList, addUserToBusyList, deleteUserFromBusyList } = require('../services/callPersistance.service');

let connected_peers = {};
let busyUsers = [];
let reverseSocketToUser = {};

let callRequests = {};

let socketIO = null;

const handleSocketConnections = (io) => {
  socketIO = io;
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
    
    // if the WebSocket connection is established (which is the most common case), 
    // you won't be able to update the cookie without closing and recreating the connection, 
    // as the headers are exchanged only at the beginning of the WebSocket connection.

    // socket.use((packet, next) => {
    //   if (socket.request.headers.cookie) {
    //     try {
    //       let cookie = socket.request.headers.cookie;
    //       let cookieValue = cookie.split('=');
    //       let base64Jwt = (cookieValue[1])? cookieValue[1] : null;
    
    //       let b64jwt = new Buffer.from(base64Jwt, 'base64');
    //       let token = JSON.parse(b64jwt);
  
    //       const payload = jwt.verify(
    //         token.jwt, 
    //         process.env.JWT_KEY
    //       );
    //       let userData = {};
    //       userData = Object.assign(userData, payload);
    //       if (userData.id && userData.displayName) {
    //         next();
    //       } else {
    //         next(new Error("unauthorized"));
    //       }
    //     }
    //     catch (error) {
    //       next(new Error("unauthorized"));
    //     }
    //   } else {
    //     next(new Error("unauthorized"));
    //   }
    // });

    socket.on('register-new-user', async (data) => {
      if (data.displayName && data.socketId) {
        connected_peers[data.displayName] = {
          socketId: data.socketId,
          fullName: data.fullName
        };
        reverseSocketToUser[data.socketId] = data.displayName;
      }

      let currentlyBusyUsers = await getUserFromBusyList();

      io.sockets.emit('broadcast', { 
        event: BROADCAST.ACTIVE_USERS,
        payload: (connected_peers)? Object.getOwnPropertyNames(connected_peers) : []
      });

      io.sockets.emit('broadcast', { 
        event: BROADCAST.USERS_BUSY,
        payload: (currentlyBusyUsers)? currentlyBusyUsers : []
      });

      ///////////////////////////////////////////////////////////
      // await addUserToBusyList('test');
      // let currentlyBusyUsers = await getUserFromBusyList();

      // console.log('BUSY USERS:', currentlyBusyUsers);
      
      // io.sockets.emit('broadcast', { 
      //   event: BROADCAST.ACTIVE_USERS,
      //   // payload: []
      //   payload: (connected_peers)? Object.getOwnPropertyNames(connected_peers).filter(busy => !currentlyBusyUsers.includes(busy)) : []
      // });

    });


    socket.on('disconnect', async () => {
      let userToDisconnect = reverseSocketToUser[socket.id];
      if (userToDisconnect) {
        delete connected_peers[userToDisconnect];
        deleteUserFromBusyList(userToDisconnect);
        let currentlyBusyUsers = await getUserFromBusyList();

        io.sockets.emit('broadcast', { 
          event: BROADCAST.ACTIVE_USERS,
          payload: (connected_peers)? Object.getOwnPropertyNames(connected_peers) : []
        });

        io.sockets.emit('broadcast', { 
          event: BROADCAST.USERS_BUSY,
          payload: (currentlyBusyUsers)? currentlyBusyUsers : []
        });

        // Let other party know that you disconnected in case of user disconnected during call dialog
        getCallDataIfExists(userToDisconnect).then(async (data) => {
          if (data.with && data.type) {
            let userIdToNotify = data.with;
            let socketId = getUserSocketId({ target: userIdToNotify});
            if (socketId) { 
              let name = userToDisconnect;
              let target = userIdToNotify;
              io.to(socketId).emit('callStatusChange', {
                name: name,
                target: target,
                status: 'CALL_CONNECTION_TERMINATED'
              });
              tearDownCallData(userIdToNotify);
              tearDownCallData(userToDisconnect);

              deleteUserFromBusyList(userIdToNotify);
              deleteUserFromBusyList(userToDisconnect);

              let currentlyBusyUsers = await getUserFromBusyList();
              io.sockets.emit('broadcast', { 
                event: BROADCAST.USERS_BUSY,
                payload: (currentlyBusyUsers)? currentlyBusyUsers : []
              });
            } 
          }
        });
        
        }    
      }
    );

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

    // Call dialogs
    socket.on('callAttempt', async (data) => {      
      // check if user is already in a call
      if (data.target) {
        let callData = await getCallDataIfExists(data.target);
        if (callData && Object.keys(callData).length === 0) {
          let socketId = getUserSocketId(data);
          if (socketId && data.name) { 
            let name = data.target;
            let target = data.name;
            io.to(socketId).emit('callAttempt', {
              name: name,
              target: target,
              type: 'callee'
            });
            establishCall(data.name, data.target);
            addUserToBusyList(data.name);
            addUserToBusyList(data.target);
            let currentlyBusyUsers = await getUserFromBusyList();
            io.sockets.emit('broadcast', { 
              event: BROADCAST.USERS_BUSY,
              payload: (currentlyBusyUsers)? currentlyBusyUsers : []
            });
          }
        } else {
          if (data && data.name && data.target) {
            io.to(connected_peers[data.name].socketId).emit('callAttemptResponse', {
              name: data.name,
              target: data.target,
              response: 'CALL_UNAVAILABLE'
            });
            // io.sockets.emit('broadcast', { 
            //   event: BROADCAST.USERS_AVAILABLE,
            //   payload: [data.name]
            // });
            // let currentlyBusyUsers = await getUserFromBusyList();

            // console.log('BUSY USERS:', currentlyBusyUsers);
            
            // io.sockets.emit('broadcast', { 
            //   event: BROADCAST.USERS_AVAILABLE,
            //   // payload: []
            //   payload: (connected_peers)? Object.getOwnPropertyNames(connected_peers).filter(busy => !currentlyBusyUsers.includes(busy)) : []
            // });

            deleteUserFromBusyList(data.name);

            let currentlyBusyUsers = await getUserFromBusyList();
            io.sockets.emit('broadcast', { 
              event: BROADCAST.USERS_BUSY,
              payload: (currentlyBusyUsers)? currentlyBusyUsers : []
            });
          }
        }
      }
    });

    socket.on('callAttemptResponse', async (data) => {
      let socketId = getUserSocketId(data);
      if (socketId && data.response && data.name) {
        let name = data.target;
        let target = data.name;
        
        io.to(socketId).emit('callAttemptResponse', {
          name: name,
          target: target,
          response: data.response
        });
        if (data.response === 'CALL_REJECTED') {
          tearDownCallData(data.name);
          tearDownCallData(data.target);
          // io.sockets.emit('broadcast', { 
          //   event: BROADCAST.USERS_AVAILABLE,
          //   payload: [data.name, data.target]
          // });
          deleteUserFromBusyList(data.name);
          deleteUserFromBusyList(data.target);


          let currentlyBusyUsers = await getUserFromBusyList();
          io.sockets.emit('broadcast', { 
            event: BROADCAST.USERS_BUSY,
            payload: (currentlyBusyUsers)? currentlyBusyUsers : []
          });

          // let currentlyBusyUsers = await getUserFromBusyList();

          // console.log('BUSY USERS:', currentlyBusyUsers);
          
          // io.sockets.emit('broadcast', { 
          //   event: BROADCAST.USERS_AVAILABLE,
          //   // payload: []
          //   payload: (connected_peers)? Object.getOwnPropertyNames(connected_peers).filter(busy => !currentlyBusyUsers.includes(busy)) : []
          // });

        }
      } else {
        if (data && data.name && data.target) {
          io.to(connected_peers[data.name].socketId).emit('callAttemptResponse', {
            name: data.name,
            target: data.target,
            response: 'CALL_UNAVAILABLE'
          });
          tearDownCallData(data.name);
          tearDownCallData(data.target);
          // io.sockets.emit('broadcast', { 
          //   event: BROADCAST.USERS_AVAILABLE,
          //   payload: [data.name, data.target]
          // });
          deleteUserFromBusyList(data.name);
          deleteUserFromBusyList(data.target);

          let currentlyBusyUsers = await getUserFromBusyList();
          io.sockets.emit('broadcast', { 
            event: BROADCAST.USERS_BUSY,
            payload: (currentlyBusyUsers)? currentlyBusyUsers : []
          });

          // let currentlyBusyUsers = await getUserFromBusyList();

          // // console.log('BUSY USERS:', currentlyBusyUsers);
          
          // io.sockets.emit('broadcast', { 
          //   event: BROADCAST.USERS_AVAILABLE,
          //   // payload: []
          //   payload: (connected_peers)? Object.getOwnPropertyNames(connected_peers).filter(busy => !currentlyBusyUsers.includes(busy)) : []
          // });

        }
      }
    });
    //callStatusChange
    socket.on('callStatusChange', async (data) => {
      let socketId = getUserSocketId(data);
      if (socketId && data.name) { 
        let name = data.target;
        let target = data.name;
        io.to(socketId).emit('callStatusChange', {
          name: name,
          target: target,
          status: 'CALL_CONNECTION_TERMINATED'
        });
        tearDownCallData(data.name);
        tearDownCallData(data.target);
        // io.sockets.emit('broadcast', { 
        //   event: BROADCAST.USERS_AVAILABLE,
        //   payload: [data.name, data.target]
        // });
        deleteUserFromBusyList(data.name);
        deleteUserFromBusyList(data.target);

        let currentlyBusyUsers = await getUserFromBusyList();
        io.sockets.emit('broadcast', { 
          event: BROADCAST.USERS_BUSY,
          payload: (currentlyBusyUsers)? currentlyBusyUsers : []
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

module.exports = {
  handleSocketConnections,
  disconnectWebSocketUser,
  checkIfUserConnected
};