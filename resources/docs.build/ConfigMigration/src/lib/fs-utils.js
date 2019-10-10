'use strict';

const fs = require('fs');

const chardet = require('chardet');


let getEncoding = function (filePath) {
    let detectedEncoding = chardet.detectFileSync(filePath);
    return Buffer.isEncoding(detectedEncoding) ? detectedEncoding : 'utf-8';
};

const readFileSyncWithAutoEncoding = function (filePath) {
    let encoding = getEncoding(filePath);
    return fs.readFileSync(filePath, encoding).replace(/^\uFEFF/, '').replace(/\u00A0/g, ' ');
};

module.exports.readFileSyncWithAutoEncoding = readFileSyncWithAutoEncoding;