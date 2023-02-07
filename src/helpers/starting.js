const path = require('path');
const fs = require('fs');

function checkDependencies() {
    const searchPath = process.cwd();
    let mongoose, express;

    const findPackageJson = (dir) => {
        if (mongoose && express) return;
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            if (mongoose && express) return;
            const filePath = path.resolve(dir, file);
            const fileStat = fs.statSync(filePath);

            if (fileStat.isDirectory() && file[0] !== '.' && file !== 'node_modules') {
                findPackageJson(filePath);
            } else if (file === "package.json") {
                const dependencies = JSON.parse(
                    fs.readFileSync(filePath, "utf-8")
                ).dependencies;

                if(dependencies.mongoose) mongoose = true;
                if(dependencies.express) express = true;
                if(dependencies.pythagora) global.Pythagora.setVersion(dependencies.pythagora);
            }
        });
    };

    findPackageJson(searchPath);

    if (!mongoose || !express) {
        console.log('For Pythagora to run you need to use "mongoose" and "express" node modules. Exiting app...')
        process.exit(1);
    }
}

module.exports = {
    checkDependencies
}
