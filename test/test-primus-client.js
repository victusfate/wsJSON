'use strict';

// some auth with jwt
const jwt             = require('jsonwebtoken');
const secret          = 'someSharedSecret'; 
const port            = 3030;
const Primus          = require('primus');
const sTransformer    = 'websockets';
const sAction         = 'primus.client';

const createToken = (options) => {
  const sAction = 'createToken';
  console.log({ action: 'createToken' });
  options = options ? options : { data: {} };
  options.options = options.options ? options.options : { expiresIn: '1 hour' };
  return jwt.sign(options.data, secret, options.options);
}

let sToken = createToken();

const Socket      = Primus.createSocket({ transformer: sTransformer })
const sSocketUrl  = `ws://localhost:${port}/?token=${sToken}`
const socket      = new Socket(sSocketUrl);

/*
function patchEmitter(emitter) {
  const oldEmit = emitter.emit;

  emitter.emit = function() {
    const emitArgs = arguments;
    console.log('emitted args',arguments)
    oldEmit.apply(emitter, arguments);
  }
}

patchEmitter(socket)
*/

socket.on('open', () => {
  console.log({ action: sAction + '.on.open', id: socket.id })
  socket.on('data', data => {
    console.log({ action: sAction + '.on.data', data: data });
  })    
})

setInterval( () => {
  const bSent = socket.write({ type: 'test', data: { some: 'info', anArray: [0,1,2,3], ts: Date.now() }});
  if (bSent == false) {
    console.error({ action: sAction + '.write.failed' });
  }

}, 1000)

socket.on('error', err => {
  console.error({ action: sAction + '.on.error', err:err, stack: err.stack })
})