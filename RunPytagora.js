'use strict';
const Pytagora = require('./app/backend/pytagora.js');

const mode = 'test';
const appPath = './app/app.js';

console.log(`Running ${appPath} using Pytagora in '${mode.toUpperCase()}' mode.`);
const P = new Pytagora(mode);
global.Pytagora = P;
(async () => {
    await P.runRedisInterceptor();
    const app = require(appPath);
})();

