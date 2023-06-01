const argsStr = process.env.PYTHAGORA_CONFIG || '';

const argArray = argsStr.split("--");
let args = {};

for (let i = 0; i < argArray.length; i++) {
    const arg = argArray[i].trim().split(' ');

    if (!arg[0]) continue;
    args[arg[0].replace(/-/g, '_')] = arg.length > 2 ? arg.slice(1) : (arg[1] || true);
}

module.exports = args
