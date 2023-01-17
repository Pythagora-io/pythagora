const express = require('express');
const app = express();
const istanbul = require('istanbul');
const fs = require('fs');
const path = require('path');
const { exec } = require("child_process");

let initLines = 0;
let instrumenter = new istanbul.Instrumenter();

istanbul.hook.hookRequire(function (path) {
    return path.indexOf(__dirname.slice(0, __dirname.indexOf('node_modules') - 1)) !== -1 &&
        path.indexOf('node_modules') === -1;
}, function (exports, name, basedir) {
    let file = path.join(basedir || '', name);
    let sourceCode = fs.readFileSync(file, 'utf8');
    return instrumenter.instrumentSync(sourceCode, file);
});

async function getTotalLinesInRepo() {
    return new Promise((resolve, reject) => {
        exec('cloc --exclude-dir=node_modules,test,tests,coverage --exclude-ext=.md --include-lang=JavaScript --json ./', (error, stdout, stderr) => {
            return (error || stderr) ? reject(error ? error.message : stderr) :
                resolve(JSON.parse(stdout).JavaScript.code);
        });
    });
}

function getCurrentlyExecutedLines(includeInitLines, getPercentage) {
    let collector = new istanbul.Collector();
    collector.add(global.__coverage__);
    let coverage = collector.getFinalCoverage();
    let linesCovered = 0;
    let totalStatements = 0;
    Object.keys(coverage).forEach(function (key) {
        linesCovered += Object.values(coverage[key].s).filter(val => val > 0).length;
        totalStatements += Object.values(coverage[key].statementMap).length;
    });
    linesCovered = linesCovered - (includeInitLines ? 0 : initLines)
    return getPercentage ? Math.round(linesCovered / (totalStatements - initLines) * 10000) / 100 :
        linesCovered;
}
async function getInitLinesOfCode() {
    let numOfLines = getCurrentlyExecutedLines(true);
    let go = true;
    while (go) {
        await new Promise(resolve => {
            let lines = getCurrentlyExecutedLines(true);

            if (lines > numOfLines) numOfLines = lines;
            else go = false;
            resolve();
        });
        await new Promise(resolve => setTimeout(resolve, 500)); // TODO replace with delay(500)
    }
    console.log('Initial number of lines executed: ', numOfLines);
    return numOfLines;
}


module.exports = {
    getInitLinesOfCode,
    getCurrentlyExecutedLines,
    getTotalLinesInRepo
}
