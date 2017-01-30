'use strict';

const wsJson              = require('../index');
const WebSocketJSONClient = wsJson.WebSocketJSONClient;
const hash                = wsJson.hash;

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

// ws.on('messageJson', data => {
//   console.log({ action: 'ws.messageJson', data: data });
// })    

setInterval( () => {
  let oSend       = { type: 'test', data: { some: 'info', anArray: [0,1,2,3], ts: Date.now() }};
  let sHash       = hash(oSend.data);
  oSend.hash      = sHash;

  ws.on(sHash, data => {
    console.log({ action: 'ws.messageJson.hash', hash:sHash, data: data });
  });

  ws.sendJson(oSend)
  .then( () => {
    // wss will emit a typeHash concatentated message
  })
  .catch( err => {
    console.error({ action: 'ws.sendJson.err', err:err });
  })
}, 1000)
