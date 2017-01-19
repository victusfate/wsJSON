'use strict';

const WebSocket       = require('ws');
const WebSocketServer = WebSocket.Server;

const EventEmitter    = require('events');

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

// went composition vs inheritance
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
    let oWebSocketServerOptions = { port: port };
    if (verifyClient != null) {
      oWebSocketServerOptions.verifyClient = verifyClient;
    }
    this.wss = new WebSocketServer(oWebSocketServerOptions);

    this.wss.on('connection', (ws) => {
      this.emit('connection');
      ws.on('message', (data) => {

        let oParsed;
        try {
          oParsed = JSON.parse(data);
          console.log({ action: sAction + '.ws.on.message', data: data, oParsed: oParsed })
          this.emit('messageJSON',oParsed);
        }
        catch (err) {
          console.error({ action: sAction + '.ws.on.message.parse.err', data: data, err: err})
        }
      });
      this.sendJson(ws,{ type: sAction + '.ws.on.connection.send', data: `server sending date ${Date.now()}` })
    });

    this.wss.on('error', (err) => {
      this.emit('error');
      console.error({ action: sAction + '.wss.err', err: err });
    })

  }

  // payload format: { type: 'messageType', data: $someJSON }
  sendJson(ws,payload) {
    ws.send(JSON.stringify(payload));
  }

}

// went composition vs inheritance to make reconnection easier
// class WebSocketJSONClient extends WebSocket {
class WebSocketJSONClient extends EventEmitter {
  constructor(options) {
    super();
    const sAction = WebSocketJSONClient.name + '.constructor';
    const sSocketUrl = options.socketUrl;
    const sToken     = options.token;
    this.ws = new WebSocket(sSocketUrl,{
      headers : {
        token: sToken
      }
    });

    this.ws.on('open', () => {
      this.emit('open');
    })

    this.ws.on('message', (data, flags) => {
      // flags.binary will be set if a binary data is received.
      // flags.masked will be set if the data was masked.
      try {
        let oParsed = JSON.parse(data);
        console.log({ action: sAction + '.ws.on.message', data: data, json: oParsed });
        this.emit('messageJSON',oParsed);
      }
      catch (err) {
        console.error({ action: sAction + '.ws.on.message.parse.err', data: data, err: err})
      }
    });


    this.ws.on('error', (err) => {
      console.error({ action: sAction + '.ws.client.err', err:err });
    })

    this.ws.on('close', () => {
      // reconnect and override ws
      setTimeout( () => {
        this.ws = new WebSocketJSONClient({ socketUrl: sSocketUrl, token: sToken });
      },10000)
    })

  }

  // payload format: { type: 'messageType', data: $someJSON }
  sendJson(payload) {
    this.ws.send(JSON.stringify(payload))
  }

}

module.exports = {
  WebSocketJSONServer : WebSocketJSONServer,
  WebSocketJSONClient : WebSocketJSONClient
}
