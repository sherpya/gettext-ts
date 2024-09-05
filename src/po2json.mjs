#!/usr/bin/env node

import fs from 'fs';
import gettextParser from "gettext-parser";

const CTX_DELIMITER = String.fromCharCode(4) // \u0004

if (process.argv.length !== 4) {
    throw new Error('Usage po2json pofile jsonfile');
}

const poData = fs.readFileSync(process.argv[2], 'utf-8');
const parsed = gettextParser.po.parse(poData);
const jsonData = {
    '': { 'language': parsed['headers']['Language'], 'plural-forms': parsed['headers']['Plural-Forms'] }
};

for (const [context, value] of Object.entries(parsed['translations'])) {
    for (let [key, translation] of Object.entries(value)) {
        if (!key) {
            continue;
        }

        if (context) {
            key = `${context}${CTX_DELIMITER}${key}`;
        }

        const any = translation.msgstr.find((msg) => Boolean(msg));
        if (any) {
            jsonData[key] = translation.msgstr.length > 1 ? translation.msgstr : translation.msgstr[0];
        }
    }
}

fs.writeFileSync(process.argv[3], JSON.stringify(jsonData, null, 4), 'utf-8')
console.log(`${process.argv[2]} converted to ${process.argv[3]}`);
