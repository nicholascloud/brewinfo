'use strict';
const path = require('path');
const fs = require('fs');
const EOL = require('os').EOL;
const exec = require('child_process').exec;
const asyncEach = require('async/each');
const mkdirp = require('mkdirp');

const args = process.argv.slice(2);
const outputDir = (args[0] || path.join(__dirname, 'dist'));

const brewls = (cb) => {
    const lines = [];
    const cmd = 'brew ls';
    console.info(`running command: ${cmd}`);
    const child = exec(cmd);
    child.stdout.on('data', (data) => {
        (data || '').split(EOL)
            .map((line) => {
                return line.trim();
            }).filter((line) => {
                return !!line;
            }).forEach((line) => {
                lines.push(line);
            });
    });
    child.stderr.on('data', (data) => {
        console.error(data);
    });
    child.on('close', (code) => {
        if (code !== 0) {
            return cb(new Error(`command "${cmd}" failed`));
        }
        cb(null, lines.sort());
    });
};

const brewinfo = (pkg, cb) => {
    const lines = [];
    const cmd = `brew info ${pkg} | sed -n 2p`;
    console.info(`running command: ${cmd}`);
    const child = exec(cmd);
    child.stdout.on('data', (data) => {
        (data || '').split(EOL)
            .map((line) => {
                return line.trim();
            }).filter((line) => {
                return !!line;
            }).forEach((line) => {
                lines.push(line);
            });
    });
    child.stderr.on('data', (data) => {
        console.error(data);
    });
    child.on('close', (code) => {
        if (code !== 0) {
            return cb(new Error(`command "${cmd}" failed`));
        }
        cb(null, lines.join(''));
    });
};

const main = () => {
    mkdirp.sync(outputDir);
    brewls((err, pkgs) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        const readme = fs.createWriteStream(path.join(outputDir, 'README.md'));
        asyncEach(pkgs, (pkg, cb) => {
            brewinfo(pkg, (err, description) => {
                const line = `- \`${pkg}\`: ${description}\n`;
                process.stdout.write(line);
                readme.write(line, cb);
            });
        }, (err) => {
            readme.on('close', () => {
                console.info('done');
                return err ? process.exit(1) : process.exit(0);
            });
            if (err) {
                console.error(err);
            }
            readme.close();
        });
    })
};

main();