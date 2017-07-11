'use strict';

const wsJson          = require('../index');
const http            = require('http');

// some auth with jwt
const jwt             = require('jsonwebtoken');
const secret          = 'someSharedSecret'; 
const port            = 3000;
const url             = require('url');


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
  const oQuery = url.parse(info.req.url,true).query
  const sBackupToken = oQuery ? oQuery.token : null;
  console.log({ info_req: info.req.url, sBackupToken: sBackupToken })

  let token = info.req.headers.token || sBackupToken;
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
const wss             = new wsJson.WebSocketJSONServer({ server: server, verifyClient: verifyClient });


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

  console.log({ action: 'wss.messageJson', connectedClients: wss.connectedClients(), socketId: socketId, data: data })
  const oResponse = { type: data.type + '.received', data: { from: socketId, date: Date.now() }, hash: data.hash};
  ws.sendJson(oResponse)
  .then( () => {
    console.log({ action: 'response sent', hash: data.hash });
  })
  .catch( err => {
    console.error({ action: 'ws.sendJson.err', err:err })
  })
})




// // if you want to test server and client together
// require('./test-client')
