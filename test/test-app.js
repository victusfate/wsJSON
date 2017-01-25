'use strict';

const wsJson          = require('../index');
const http            = require('http');

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

const validateToken = (sToken) => {
  const sAction = 'validateToken'
  return new Promise( (resolve,reject) => {
    jwt.verify(sToken, secret, function(err, decoded) {
      if (err) {
        reject(err);        
      }
      else {
        console.log({ action:sAction, date:Date.now(), decoded: decoded });
        resolve(decoded);        
      }
    });    
  });
}

const verifyClient = (info, cb) => {
  const sAction = 'verifyClient';
  let token = info.req.headers.token;
  // console.log({ action: sAction, token: token })
  if (!token) {
    cb(false, 403, 'Unauthorized')
  }
  else {
    validateToken(token).then( decoded => {
      info.req.decoded = decoded
      cb(true)
    })
    .catch( err => {
      cb(false, 403, 'Unauthorized')
    })
  }
}

let sToken = createToken();

// const wss = new wsJson.WebSocketJSONServer({ port: port, verifyClient: verifyClient });

const handleRequest   = function(req,res) {
  res.end('aok');
}
const server          = http.createServer(handleRequest).listen(port);
const wss = new wsJson.WebSocketJSONServer({ server: server, verifyClient: verifyClient });
wss.on('messageJson', (data) => {
  console.log({ action: 'wss.messageJson', data: data })
})


/*
// if you want to test server and client together
require('./test-client')
*/