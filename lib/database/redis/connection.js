'use strict';

const nconf = require('nconf');
const {
  createClient,
  createCluster,
  createSentinel
} = require('redis');
const winston = require('winston');
const connection = module.exports;
connection.connect = async function (options) {
  return new Promise((resolve, reject) => {
    options = options || nconf.get('redis');
    const redis_socket_or_host = options.host;
    let cxn;
    if (options.cluster) {
      const rootNodes = options.cluster.map(node => ({
        url: `redis://${node.host}:${node.port}`
      }));
      cxn = createCluster({
        ...options.options,
        rootNodes: rootNodes
      });
    } else if (options.sentinels) {
      const sentinelRootNodes = options.sentinels.map(sentinel => ({
        host: sentinel.host,
        port: sentinel.port
      }));
      cxn = createSentinel({
        ...options.options,
        sentinelRootNodes
      });
    } else if (redis_socket_or_host && String(redis_socket_or_host).indexOf('/') >= 0) {
      cxn = createClient({
        ...options.options,
        password: options.password,
        database: options.database,
        socket: {
          path: redis_socket_or_host,
          reconnectStrategy: 3000
        }
      });
    } else {
      cxn = createClient({
        ...options.options,
        password: options.password,
        database: options.database,
        socket: {
          host: redis_socket_or_host,
          port: options.port,
          reconnectStrategy: 3000
        }
      });
    }
    const dbIdx = parseInt(options.database, 10);
    if (!(dbIdx >= 0)) {
      throw new Error('[[error:no-database-selected]]');
    }
    cxn.on('error', err => {
      winston.error(err.stack);
      reject(err);
    });
    cxn.connect().then(() => {
      cxn.batch = cxn.multi;
      resolve(cxn);
    }).catch(err => {
      winston.error('Error connecting to Redis:', err);
    });
  });
};
require('../../promisify')(connection);