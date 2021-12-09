const { createClient } = require('redis');

let client;
let redisStatus = '';

async function redisConnect() {
  client = createClient({
    url: process.env.REDIS_URI,
    password: process.env.REDIS_PW
  });

  // client.on('error', (err) => console.log('Redis Client Error', err));

  try {
    await client.connect();
    redisStatus = 'up';
  } catch(error) {
    console.log('Redis failed to connect');
    redisStatus = 'down';
  }

  if (redisStatus === 'up') {
    await client.sendCommand(['FLUSHALL']);
  }
}

async function setKeyValue(key, field1, value1, field2, value2, expire) {
  /*
  {
    EX: expire,
    NX: true
  }
   */
  await client.hSet(key, field1, value1, {
    NX: true
  });
  await client.hSet(key, field2, value2, {
    NX: true
  });  
}

async function deleteKey(key) {
  await client.del(key);
}

function getValue(key) {  
  return client.hGetAll(key);
}

function getRedisConnectionStatus() {
  return redisStatus;
}

async function checkRedisStatus() {
  const timeoutPromise = new Promise((res) => {
    setTimeout(() => res("down"), 2000)
  });
  try {
    const result = await Promise.race([client.ping(), timeoutPromise]);
    if ('PONG' === result) {
      return 'up';
    }
    return result;
  }
  catch (e) {
    return 'down';
  }
}

// async function checkRedisStatus() { 
//     const [ping] = await Promise.all([
//       client.ping(),
//     ]);
//     if ('PONG' === ping) {
//       return 'up';
//     } else {
//       return 'down';
//     }   
// }

async function pushToList(listName, value) {
  await client.sendCommand(['SADD', listName, value]);
}

async function deleteFromList(listName, value) {
  await client.sendCommand(['SREM', listName, value]);
}

async function getItemsFromList(listName) {
  let usersFromList = [];
  usersFromList = await client.sendCommand(['SMEMBERS', listName]);
  return usersFromList;
}

async function redisDisconnect() {
  if (client) {
    await client.disconnect();
  }
}

module.exports = {
  redisConnect,
  checkRedisStatus,
  redisDisconnect,
  getRedisConnectionStatus,

  getValue,
  setKeyValue,
  deleteKey,

  pushToList,
  deleteFromList,
  getItemsFromList
}