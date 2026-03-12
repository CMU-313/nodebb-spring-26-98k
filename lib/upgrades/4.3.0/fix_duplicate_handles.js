'use strict';

const user = require('../../user');
const categories = require('../../categories');
const activitypub = require('../../activitypub');
const db = require('../../database');
module.exports = {
  name: 'Fix duplicate accounts sharing identical handles',
  timestamp: Date.UTC(2025, 3, 29),
  method: async function () {
    const {
      progress
    } = this;
    let handles = await db.getSortedSetMembers('ap.preferredUsername:sorted');
    handles = handles.map(handle => handle.split(':https://')[0]);
    const duplicateUsers = new Set();
    handles.forEach((handle, idx) => {
      if (handles.indexOf(handle) !== idx) {
        duplicateUsers.add(handle);
      }
    });
    handles = await db.getSortedSetMembers('categories:name');
    handles = handles.filter(handle => handle.indexOf('@') !== -1).map(handle => handle.split(':https://')[0]);
    const duplicateCategories = new Set();
    handles.forEach((handle, idx) => {
      if (handles.indexOf(handle) !== idx) {
        duplicateCategories.add(handle);
      }
    });
    progress.total = duplicateUsers.size + duplicateCategories.size;
    await Promise.all(Array.from(duplicateUsers).map(async handle => {
      const max = '(' + handle.substr(0, handle.length - 1) + String.fromCharCode(handle.charCodeAt(handle.length - 1) + 1);
      let ids = await db.getSortedSetRangeByLex('ap.preferredUsername:sorted', `[${handle}`, max);
      ids = ids.map(id => id.slice(handle.length + 1));
      const {
        actorUri: canonicalId
      } = await activitypub.helpers.query(handle);
      await Promise.all(ids.map(async id => {
        if (id !== canonicalId) {
          try {
            await user.deleteAccount(id);
          } catch (e) {
            await db.sortedSetRemove('ap.preferredUsername:sorted', `${handle}:${id}`);
          }
        }
      }));
      if (canonicalId) {
        await db.setObjectField('handle:uid', handle, canonicalId);
      }
      progress.incr();
    }));
    await Promise.all(Array.from(duplicateCategories).map(async handle => {
      const max = '(' + handle.substr(0, handle.length - 1) + String.fromCharCode(handle.charCodeAt(handle.length - 1) + 1);
      let ids = await db.getSortedSetRangeByLex('categories:name', `[${handle}`, max);
      ids = ids.map(id => id.slice(handle.length + 1));
      const {
        actorUri: canonicalId
      } = await activitypub.helpers.query(handle);
      await Promise.all(ids.map(async id => {
        if (id !== canonicalId) {
          await categories.purge(id, 0);
        }
      }));
      if (canonicalId) {
        await db.setObjectField('handle:cid', handle, canonicalId);
      }
      progress.incr();
    }));
  }
};