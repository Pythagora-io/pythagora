const fs = require('fs');
const path = require('path');

const folderPath = './pythagora_tests';

fs.readdir(folderPath, (err, files) => {
    if (err) throw err;

    files.forEach(file => {
        const filePath = path.join(folderPath, file);
        const newFilePath = filePath.replace(/\|/g, '-_-');

        fs.rename(filePath, newFilePath, err => {
            if (err) throw err;
            console.log(`${filePath} renamed to ${newFilePath}`);
        });
    });
});
