'use strict';

const wsJson          = require('../index');
const http            = require('http');

// some auth with jwt
const jwt             = require('jsonwebtoken');
const secret          = 'someSharedSecret'; 
const port            = 3000;


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
  // console.log({ info_req: info.req })
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
const fSocketClose    = function(ws) { 
  console.log({ action: 'fSocketClose', upgradeReq: ws && ws.upgradeReq && ws.upgradeReq ? ws.upgradeReq.decoded : null }) 
}
const wss             = new wsJson.WebSocketJSONServer({ server: server, verifyClient: verifyClient, fSocketClose: fSocketClose });


// for debugging
// function patchEmitter(emitter) {
//   const oldEmit = emitter.emit;

//   emitter.emit = function() {
//     const emitArgs = arguments;
//     console.log('wss emitted args',arguments)
//     oldEmit.apply(emitter, arguments);
//   }
// }

// patchEmitter(wss)

const idFromSocket = (ws) => {
  return ws && ws.upgradeReq && ws.upgradeReq.decoded ? ws.upgradeReq.decoded.socketId : null;
}

wss.on('messageJson', options => {
  const ws        = options.ws;
  const data      = options.data;
  const socketId  = idFromSocket(ws);  
  console.log({ action: 'wss.messageJson', data: data })

  console.log({ action: 'wss.messageJson', socketId: socketId, data: data })
  const oBroadcast = { type: data.type + '.broadcast', data: { from: socketId, date: Date.now() }, hash: data.hash};
  wss.broadcastJson(oBroadcast)
  .then( () => {
    console.log({ action: 'response broadcasted', hash: data.hash });
  })
  .catch( err => {
    console.error({ action: 'ws.broadcastJson.err', err:err })
  })
})




// // if you want to test server and client together
// require('./test-client')
