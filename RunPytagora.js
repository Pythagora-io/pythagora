'use strict';
const mongoose = require("mongoose");
const Pytagora = require('pytagora');
var P = new Pytagora(mongoose, 'test');
global.Pytagora = P;
(async () => {
    await P.runRedisInterceptor();
    const app = require('./app/app');
})();

