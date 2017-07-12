'use strict';

const WebSocket       = require('ws');
// const WebSocket       = require('uws');  // bindings https://github.com/uWebSockets/bindings/blob/master/nodejs/examples/echo.js
const WebSocketServer = WebSocket.Server;
const EventEmitter    = require('events');
const crypto          = require('crypto');
const uuid            = require('uuid');

function normalizePort(val) {
  let port = parseInt(val, 10);
  if (isNaN(port)) {
    // named pipe
    return val;
  }
  if (port >= 0) {
    // port number
    return port;
  }
  return false;
}


const sha1 = (data) => {
  if (typeof data === 'string' || Buffer.isBuffer(data)) {
    return crypto.createHash('sha1').update(data).digest('hex')    
  }
  else {
    return crypto.createHash('sha1').update(JSON.stringify(data)).digest('hex')        
  }
}

const sha256 = (data) => {
  if (typeof data === 'string' || Buffer.isBuffer(data)) {
    return crypto.createHash('sha256').update(data).digest('hex')    
  }
  else {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')        
  }
}

const hash = uuid

// went composition vs inheritance
// emits: connection, messageJson, and error
// class WebSocketJSONServer extends WebSocketServer {
class WebSocketJSONServer extends EventEmitter {
  constructor(options) {
    super();
    const sAction = WebSocketJSONServer.name + '.constructor';
    this.serverId = uuid();

    let port = options.port;
    if (typeof port !== 'number') {
      port = normalizePort(process.env.PORT || '3000');
    }
    let verifyClient = options.verifyClient;
    let server       = options.server;
    let fSocketClose = typeof options.fSocketClose === 'function' ? options.fSocketClose : null;

    let oWebSocketServerOptions = {
      perMessageDeflate: false
    };
    if (server) {
      oWebSocketServerOptions.server = server;
    }
    else {
      oWebSocketServerOptions.port = port;
    }
    if (verifyClient != null) {
      oWebSocketServerOptions.verifyClient = verifyClient;
    }

    this.wss = new WebSocketServer(oWebSocketServerOptions);

    // use ping to close out idle connections
    const interval = setInterval( () => {
      this.wss.clients.forEach( (ws) => {
        if (ws.isAlive === false) {
          console.info({ action: sAction + '.terminating.idle.client', serverId: this.serverId, upgradeReq: ws && ws.upgradeReq && ws.upgradeReq ? ws.upgradeReq.decoded : null });
          if (fSocketClose) {
            fSocketClose(ws);
          }
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping('', false, true);
      });
    }, 30000);

    this.wss.on('connection', (ws,data) => {
      console.info({ action: sAction + '.on.connection', serverId: this.serverId, connectedClients: this.connectedClients() })
      ws.isAlive = true;
      ws.on('pong', () => { 
        ws.isAlive = true;
      });
      ws.upgradeReq = data;

      // ensure emitted vanilla ws websocket has a sendJson method
      ws.sendJson = payload => {
        return new Promise( (resolve,reject) => {
          ws.send(JSON.stringify(payload), err => {
            if (err) {
              reject(err);
            }
            else {
              resolve();
            }
          });
        });
      }

      this.emit('connection');

      function onClose() {
        if (fSocketClose) {
          fSocketClose(ws);
        }        
      }

      // used for ws
      function onMessage(rawData,flags) {
        // console.log({ action: sAction + '.ws.on.message', data: rawData, flags: flags })

        // support binary data
        let data = flags && flags.binary === true && Buffer.isBuffer(rawData) ? rawData.toString('utf8') : rawData;

        let oParsed;
        try {
          oParsed = JSON.parse(data);
          this.emit('messageJson',{ ws: ws, data: oParsed });
        }
        catch (err) {
          if (Buffer.isBuffer(rawData)) {
            console.error({ action: sAction + '.ws.on.message.Buffer.parse.err', data: data, sData: rawData.toString(), flags: flags, err: err})
          }
          else {
            console.error({ action: sAction + '.ws.on.message.parse.err', data: data, flags:flags, err: err})
          }
          const oError = { type: 'error', message: 'error parsing payload', data: data };
          ws.sendJson(oError)
          .then()
          .catch(err => {
            console.error({ action: sAction + '.ws.send.parse.error.err', data: data, flags:flags, err: err})
          })
        }
      }
      ws.on('message', onMessage.bind(this));

      ws.on('close', onClose.bind(this));

      // used for uws
      // function onMessage(message) {
      //   // console.log({ action: sAction + '.ws.on.message', data: data, flags: flags })

      //   let oParsed;
      //   try {
      //     oParsed = JSON.parse(message);
      //     this.emit('messageJson',{ ws: ws, data: oParsed });
      //   }
      //   catch (err) {
      //     console.error({ action: sAction + '.ws.on.message.parse.err', data: data, err: err})
      //   }
      // }        

      // // from https://github.com/uWebSockets/bindings/blob/master/nodejs/examples/echo.js
      // // warning: never attach anonymous functions to the socket!
      // // that will majorly harm scalability since the scope of this
      // // context will be taken hostage and never released causing major
      // // memory usage increases compared to having the function created
      // // outside of this context (1.2 GB vs 781 MB for 1 million connections)
      // ws.on('message', onMessage.bind(this));
      
      let oSend   = { type: sAction + '.ws.on.connection.send.date', data: Date.now() };
      ws.sendJson(oSend)
      .then( () => {
        // send success
      })
      .catch( err => {
        console.error({ action: sAction + '.ws.on.connection.send.err', err: err })
      })
    });


    this.wss.on('error', (err) => {
      console.error({ action: sAction + '.wss.err', err: err, stack: err.stack });
      this.emit('error', err);
    });
  }

  send(ws,payload) {
    return new Promise( (resolve,reject) => {
      ws.send(payload, (err) => {
        if (err) {
          reject(err);
        }
        else {
          resolve();
        }
      });
    })
  }


  // payload format: { type: 'messageType', data: $someJSON }
  sendJson(ws,payload) {
    return this.send(ws,JSON.stringify(payload));
  }


  broadcastJson(payload) {
    const sJsonPayload = JSON.stringify(payload);

    const sendReturnError = (ws,payload) => {
      return new Promise( (resolve,reject) => {
        ws.send(payload, (err) => {
          if (err) {
            resolve(err);
          }
          else {
            resolve();
          }
        });
      })
    }

    let aPromises = [];
    this.wss.clients.forEach( ws => {      
      aPromises.push(sendReturnError(ws,sJsonPayload));
    });
    return Promise.all(aPromises);    
  }

  close() {
    this.wss.close();
  }

  connectedClients() {
    return this.wss && typeof this.wss.clients.size === 'number' ? this.wss.clients.size : 0;
  }
}

// went composition vs inheritance to make reconnection easier
// emits: open, messageJson, and error
// class WebSocketJSONClient extends WebSocket {
class WebSocketJSONClient extends EventEmitter {
  constructor(options) {
    super();
    const sAction  = WebSocketJSONClient.name + '.constructor';
    this.socketUrl = options.socketUrl;
    this.token     = options.token;
    this.connectAndListen();
  }

  listeners() {
    const sAction = WebSocketJSONClient.name + '.listeners';
    this.ws.on('open', () => {
      this.emit('open');
    })

    this.ws.on('message', (data, flags) => {
      // flags.binary will be set if a binary data is received.
      // flags.masked will be set if the data was masked.

      // console.log({ action: sAction + '.ws.on.message', data: data, flags: flags })
      
      try {
        let oParsed = JSON.parse(data);
        // console.log({ action: sAction + '.ws.on.message', data: data, json: oParsed });

        // emit all received messages as messageJson
        this.emit('messageJson',oParsed); 

        // emit hash if provided
        if (typeof oParsed.hash === 'string' && oParsed.hash.length > 0) { 
          // console.log('emitting a parsed.hash',oParsed.hash)
          this.emit(oParsed.hash, oParsed);
        }
      }
      catch (err) {
        console.error({ action: sAction + '.ws.on.message.parse.err', data: data, err: err})
      }
    });


    this.ws.on('error', (err) => {
      console.error({ action: sAction + '.ws.client.err', err:err });
      this.emit('error', err);
    })

    this.ws.on('close', () => { // ws interface
    // this.ws.on('close', (code, message) => { // uws interface
      // reconnect and override ws
      setTimeout( () => {
        try {
          this.connectAndListen();
        }
        catch(err) {
          console.error({ action: sAction + '.on.close.reconnect.err', err:err });
        }
      },2000)
    })
  }

  // uws doesn't support passed headers yet https://github.com/uWebSockets/bindings/issues/4
  connectAndListen() {
    this.ws = new WebSocket(this.socketUrl,{
      headers : {
        token: this.token
      }
    })
    this.listeners();     
  }

  // payload format: { type: 'messageType', data: $someJSON, hash: on request hash of data, on response hash of request data }
  sendJson(payload) {
    return new Promise( (resolve,reject) => {
      this.ws.send(JSON.stringify(payload), (err) => {
        if (err) {
          reject(err);
        }
        else {
          resolve();
        }
      });
    });
  }

  send(payload) {
    return new Promise( (resolve,reject) => {
      this.ws.send(payload, (err) => {
        if (err) {
          reject(err);
        }
        else {
          resolve();
        }
      });
    });
  }

}

module.exports = {
  WebSocketJSONServer : WebSocketJSONServer,
  WebSocketJSONClient : WebSocketJSONClient,
  hash                : hash,
  sha1                : sha1,
  sha256              : sha256
}
