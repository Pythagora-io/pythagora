#!/usr/bin/env node

'use strict';

function exit() {
  // Do not close process until Pythagora finishing up is done
}

process.on('SIGINT', exit.bind(this));
process.on('exit', exit.bind(this));

const { exec, spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

let bashCommand, winOS;

switch(os.type()) {
  case 'Windows_NT':
    bashCommand = 'where bash';
    winOS = true;
    break;
  case 'Linux':
  case 'Darwin':
  default:
    bashCommand = 'which bash';
    break;
}

// Find the location of bash
exec(bashCommand, (error, stdout, stderr) => {
  if (error || stderr) {
    console.error('Bash not found. Please install bash and make sure it is in your PATH.');
    return;
  }

  const bashPaths = stdout.split('\r\n').filter(line => line.trim() !== '').map(line => line.trim());
  const bashPath = bashPaths.find((p) => fs.existsSync(p));
  const bashScript = winOS ? process.argv[1].replace('run.js', 'run.bash') : path.join(__dirname, '/run.bash');
  const args = process.argv.slice(2);

  // Run the bash script and forward all arguments
  const child = spawn(bashPath, [bashScript, ...args], { stdio: 'inherit' });

  child.on('error', (error) => {
    console.error(`Error running the bash script: ${error.message}`);
  });

  child.on('exit', (code) => {
    console.log(`Bash script exited with code ${code}`);
  });
});
