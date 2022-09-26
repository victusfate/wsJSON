'use strict';

const wsJson              = require('../index');
const WebSocketJSONClient = wsJson.WebSocketJSONClient;
const hash                = wsJson.hash;
const uuid                = require('uuid');


// some auth with jwt
const jwt                 = require('jsonwebtoken');
const secret              = 'someSharedSecret'; 
const port                = 3000;
const sSocketUrl          = `ws://localhost:${port}`


const createToken = (options) => {
  const sAction = 'createToken';
  console.log({ action: 'createToken' });
  options = options ? options : { data: { socketId: uuid.v4() } };
  options.options = options.options ? options.options : { expiresIn: '1 hour' };
  return jwt.sign(options.data, secret, options.options);
}

let sToken = createToken();

const ws = new WebSocketJSONClient({ socketUrl: sSocketUrl + `?token=${sToken}`, token: sToken, bReconnect: false });
// const ws = new WebSocketJSONClient({ socketUrl: sSocketUrl + `?token=${sToken}` });

let interval = null

ws.on('open', () => {
  console.log({ action: 'ws.on.open' });
})

ws.on('error', (err) => {
  console.error({ action: 'ws.on.error', err: err });
});

ws.on('close', () => {
  console.log({ action: 'ws.on.close' });
  clearInterval(interval)
})

// ws.on('messageJson', data => {
//   console.log({ action: 'ws.messageJson', data: data });
// })    

interval = setInterval( () => {
  let oSend       = { type: 'test', data: { some: 'info', anArray: [0,1,2,3], ts: Date.now() }};
  let sHash       = hash(oSend.data);
  oSend.hash      = sHash;

  ws.on('messageJson', data => {
    console.log({ action: 'ws.messageJson.hash', hash:sHash, data: data });
  });

  // ws.send(new Buffer('someBinary'))
  ws.sendJson(oSend)
  .then( () => {
    // wss will emit a typeHash concatentated message
  })
  .catch( err => {
    console.error({ action: 'ws.sendJson.err', err:err });
  })
}, 1000)
