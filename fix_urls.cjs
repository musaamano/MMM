const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            // Ignore node_modules
            if (file === 'node_modules') continue;
            processDir(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Using positive lookahead or just distinct captures to convert quotes to backticks
            const regexSingle = /'http:\/\/localhost:5000([^']*)'/g;
            if (regexSingle.test(content)) {
                content = content.replace(regexSingle, '`http://${window.location.hostname}:5000$1`');
                modified = true;
            }

            const regexDouble = /"http:\/\/localhost:5000([^"]*)"/g;
            if (regexDouble.test(content)) {
                content = content.replace(regexDouble, '`http://${window.location.hostname}:5000$1`');
                modified = true;
            }

            // For existing backticks
            // Using a simple literal replacement for existing backtick blocks
            if (content.includes('`http://localhost:5000')) {
                content = content.split('`http://localhost:5000').join('`http://${window.location.hostname}:5000');
                modified = true;
            }
            
            // For constants without quotes (edge cases, but less common)
            if (content.includes('http://localhost:5000') && !content.includes('${window.location.hostname}')) {
                // We'll leave these logged to inspect manually if the above 3 missed anything
                console.log('Watch out for unreplaced localhost in:', fullPath);
            }

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated: ' + fullPath);
            }
        }
    }
}

try {
    processDir('d:/TT/TT/src');
    console.log('Update Complete!');
} catch (e) {
    console.error(e);
}
