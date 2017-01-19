'use strict';

const WebSocket       = require('ws');
const WebSocketServer = WebSocket.Server;

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


const sAction = 'WebSocketServer';
const wss = new WebSocketServer({
  port: port,
  verifyClient: verifyClient
});

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(data) {

    let oParsed;
    try {
      oParsed = JSON.parse(data);
    }
    catch (err) {
      console.error({ action: sAction + '.ws.on.message.parse.err', data: data, err: err})
    }
    console.log({ action: sAction + '.ws.on.message', data: data, oParsed: oParsed })
  });
  
  ws.send(JSON.stringify({ action: sAction + '.ws.on.connection.send', data: `server sending date ${Date.now()}` }));
});

wss.on('error', function(err) {
  console.error({ action: sAction + '.wss.err', err: err });
  // process.exit(1);
})



const createSocketClient = (sToken) => {
  const sAction = 'createSocketClient';
  return new Promise( (resolve,reject) => {
    const ws = new WebSocket('ws://localhost:3000',{
      headers : {
        token: sToken
      }
    });

    ws.on('open', function open() {
      resolve(ws);
      resolve = null;
      // ws.send('client something');
    });

    ws.on('message', function incoming(data, flags) {
      // flags.binary will be set if a binary data is received.
      // flags.masked will be set if the data was masked.
      try {
        let oParsed = JSON.parse(data);
        console.log({ action: sAction + '.ws.on.message', data: data, json: oParsed })
      }
      catch (err) {
        console.error({ action: sAction + '.ws.on.message.parse.err', data: data, err: err})
      }
    });


    ws.on('error', function(err) {
      reject(err);
      reject = null;
      console.error({ action: sAction + '.ws.client.err', err:err });
    })

  });
}

let sToken = createToken();
// let sToken = 'crap' // test failure

createSocketClient(sToken)
.then( ws => {
  console.error({ action: 'createSocketClient.success' });
  ws.send(JSON.stringify({ type: 'loveMessage', message: 'client something' }));
})
.catch( err => {
  console.error({ action: 'createSocketClient.err', err:err });
})

