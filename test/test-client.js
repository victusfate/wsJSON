'use strict';

const wsJson              = require('../index');
const WebSocketJSONClient = wsJson.WebSocketJSONClient;

// some auth with jwt
const jwt             = require('jsonwebtoken');
const secret          = 'someSharedSecret'; 
const port            = 3000;
const sSocketUrl      = `ws://localhost:${port}`

const createToken = (options) => {
  const sAction = 'createToken';
  console.log({ action: 'createToken' });
  options = options ? options : { data: {} };
  options.options = options.options ? options.options : { expiresIn: '1 hour' };
  return jwt.sign(options.data, secret, options.options);
}

let sToken = createToken();

const ws = new WebSocketJSONClient({ socketUrl: sSocketUrl, token: sToken });

// function patchEmitter(emitter) {
//   const oldEmit = emitter.emit;

//   emitter.emit = function() {
//     const emitArgs = arguments;
//     console.log('socket emitted args',arguments)
//     oldEmit.apply(emitter, arguments);
//   }
// }

// patchEmitter(ws)

ws.on('open', () => {
  console.log({ action: 'ws.on' });
})

ws.on('messageJson', data => {
  console.log({ action: 'ws.messageJson', data: data });
})    

setInterval( () => {
  ws.sendJson({ type: 'test', data: { some: 'info', anArray: [0,1,2,3], ts: Date.now() }})
  .then( () => {})
  .catch( err => {
    console.error({ action: 'ws.sendJson.err', err:err });
  })
}, 1000)
