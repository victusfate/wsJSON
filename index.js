'use strict';

const WebSocket       = require('ws');
const WebSocketServer = WebSocket.Server;
const EventEmitter    = require('events');
const crypto          = require('crypto');

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

const hash = oData => {
  let sha256 = crypto.createHash('sha256');
  return sha256.update(JSON.stringify(oData)).digest('hex');
}

// went composition vs inheritance
// emits: connection, messageJson, and error
// class WebSocketJSONServer extends WebSocketServer {
class WebSocketJSONServer extends EventEmitter {
  constructor(options) {
    super();
    const sAction = WebSocketJSONServer.name + '.constructor';

    let port = options.port;
    if (typeof port !== 'number') {
      port = normalizePort(process.env.PORT || '3000');
    }
    let verifyClient = options.verifyClient;
    let server       = options.server;
    let oWebSocketServerOptions = {};
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

    this.wss.on('connection', ws => {

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
      ws.on('message', data => {

        let oParsed;
        try {
          oParsed = JSON.parse(data);
          // console.log({ action: sAction + '.ws.on.message', data: data, oParsed: oParsed })
          this.emit('messageJson',{ ws: ws, data: oParsed });
        }
        catch (err) {
          console.error({ action: sAction + '.ws.on.message.parse.err', data: data, err: err})
        }
      });
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
    })

  }

  // payload format: { type: 'messageType', data: $someJSON }
  sendJson(ws,payload) {
    return new Promise( (resolve,reject) => {
      ws.send(JSON.stringify(payload), (err) => {
        if (err) {
          reject(err);
        }
        else {
          resolve();
        }
      });
    })
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

    this.ws.on('close', () => {
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

}

module.exports = {
  WebSocketJSONServer : WebSocketJSONServer,
  WebSocketJSONClient : WebSocketJSONClient,
  hash                : hash
}
