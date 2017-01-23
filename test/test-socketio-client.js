'use strict';

// some auth with jwt
const jwt             = require('jsonwebtoken');
const secret          = 'someSharedSecret'; 
const port            = 3000;
const sSocketUrl      = `ws://localhost:${port}`
const sHttpUrl        = `http://localhost:${port}`

const createToken = (options) => {
  const sAction = 'createToken';
  console.log({ action: 'createToken' });
  options = options ? options : { data: {} };
  options.options = options.options ? options.options : { expiresIn: '1 hour' };
  return jwt.sign(options.data, secret, options.options);
}

let sToken = createToken();
// let sToken = 'busted'

const sAction = 'socket.io.client';
const socket = require('socket.io-client')(sHttpUrl, {
  query: 'token=' + sToken
});

socket.on('connect', err => {
  if (err) {
    console.log({ action: sAction + '.on.connect.err', err:err })
  }
  else {
    setInterval( () => {
      console.log({ action: sAction + '.interval.emit' });
      socket.emit('foo', { type: 'test', data: { some: 'info', anArray: [0,1,2,3], ts: Date.now() }}, (err) => {
        console.error({ action: sAction + '.emit.err', err:err });
      });
    }, 1000);    
  }
});

socket.on('bar', data => {
  console.log({ action: sAction + '.on.message', data: data });
})

socket.on('disconnect', huh => {
  console.log({ action: sAction + '.on.disconnect', huh: huh })
})

socket.on('error', err => {
  console.error({ action: sAction + '.on.error', err:err })
})
