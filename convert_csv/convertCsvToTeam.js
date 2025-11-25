import csv from 'csvtojson';
import fs from 'fs';

const csvFilePath = 'csv_data/team.csv';
const outputFilePath = 'src/data/Teams.js';

csv()
.fromFile(csvFilePath)
.then((jsonObj)=>{
    const output = `export const Teams = ${JSON.stringify(jsonObj, null, 2)};\n`;
    fs.writeFileSync(outputFilePath, output, 'utf8');
    console.log('CSV to Teams.js conversion completed.');
});
