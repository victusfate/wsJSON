'use strict';

// some auth with jwt
const url             = require('url');
const jwt             = require('jsonwebtoken');
const secret          = 'someSharedSecret'; 
const port            = 3000;
const sSocketUrl      = `ws://localhost:${port}`
const Primus          = require('primus');
const sTransformer    = 'websockets';


const sAction         = 'primus';

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

const verifyClient = (req, done) => {
  const sAction = 'verifyClient';

  // console.log({ action: sAction, reqUrl: req.url })
  let token = url.parse(req.url, true).query.token;
  if (!token) {
    let error = new Error('Unauthorized');
    error.statusCode = 403;
    done(error)
  }
  else {
    validateToken(token).then( decoded => {
      req.decoded = decoded
      done();
    })
    .catch( err => {
      console.error({ action: sAction + '.validateToken.err', err:err })
      let error = new Error('Unauthorized');
      error.statusCode = 403;
      done(error)
    })
  }

  // req.on('error', err => {
  //   console.error({ action: sAction + '.socket.on.error', err: err });
  //   socket.disconnect();
  // })
  
}

let sToken = createToken();

// var server = require('https').createServer(

const primus = Primus.createServer({
  port: port,
  // authorization: verifyClient,
  transformer: sTransformer
});

primus.authorize(verifyClient);

primus.on('connection', spark => {
  console.log({ action: sAction + '.on.connection', id: spark.id });
  spark.on('data', data => {
    console.log({ action: sAction + '.on.data', data: data });
    const eventType = sAction + '.socket.on.connection.send';
    let bSent = spark.write({ type: eventType, data: `server sending date ${Date.now()}` })
    if (bSent == false) {
      console.error({ action: sAction + '.write.failed' })
    }
  });
});

primus.on('disconnection', spark => {
  console.log({ action: sAction + '.on.disconnection', id: spark.id });
});