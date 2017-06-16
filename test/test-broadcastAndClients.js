require('./test-appBroadcast');
const spawn   = require('child_process').spawn;


const spawnClient = () => {
  const client = spawn('node', ['test-client']);
  client.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  client.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
  });

  client.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });   
}

spawnClient();
spawnClient();
