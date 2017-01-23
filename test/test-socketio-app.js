'use strict';

// some auth with jwt
const jwt             = require('jsonwebtoken');
const secret          = 'someSharedSecret'; 
const port            = 3000;
const sSocketUrl      = `ws://localhost:${port}`
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
  console.log({ action: sAction, sToken: sToken })
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

const verifyClient = (socket, next) => {
  const sAction = 'verifyClient';

  let handshakeUrl = socket.handshake.url;
  let token = url.parse(handshakeUrl, true).query.token;  
  console.log({ action: sAction, handshakeUrl: handshakeUrl })
  if (!token) {
    next(new Error('Unauthorized'))
  }
  else {
    validateToken(token).then( decoded => {
      socket.decoded = decoded
      next();
    })
    .catch( err => {
      // console.error({ action: sAction + '.validateToken.err', err:err })
      next(new Error('Unauthorized'))
    })
  }

  socket.on('error', err => {
    console.error({ action: sAction + '.socket.on.error', err: err });
    socket.disconnect();
  })
}

// socket io requires an http server
const sAction = 'io';
const srv = require('http').createServer();
const io = require('socket.io')(srv);
srv.listen(port, () => {
  console.log('listening on port',port);

  io.use(verifyClient);
  io.on('connection', socket => {
    console.log({ action: sAction + '.on.connection' });
    socket.on('foo', data => {
      console.log({ action: sAction + '.on.message', data: data });
      const eventType = sAction + '.socket.on.connection.send';
      socket.emit('bar', { type: eventType, data: `server sending date ${Date.now()}` })
    });
  });


  // require('./test-socketio-client')

})
