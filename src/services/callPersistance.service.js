const { setKeyValue, deleteKey, getValue, pushToList, deleteFromList, getItemsFromList } = require('../services/redis.service');

const TIMEOUT_FOR_CALL_PICKUP = 10;

const CALL_TYPE = {
  CALLER: 'CALLER',
  CALLEE: 'CALLEE'
};

async function establishCall(from, to) {
  await setKeyValue(from, 'type', CALL_TYPE.CALLER, 'with', to);
  await setKeyValue(to, 'type', CALL_TYPE.CALLEE, 'with', from);
}

async function addUserToBusyList(userId) {
  await pushToList('busyList', userId);
}

async function deleteUserFromBusyList(userId) {
  await deleteFromList('busyList', userId);
}

async function getUserFromBusyList() {
  return getItemsFromList('busyList');
}

async function getCallDataIfExists(forUser) {
  return await getValue(forUser);
}

async function tearDownCallData(forUser) {
  deleteKey(forUser);
}

module.exports = {
  establishCall,
  getCallDataIfExists,
  tearDownCallData,
  
  addUserToBusyList,
  deleteUserFromBusyList,
  getUserFromBusyList
}