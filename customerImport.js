var csv = require('csv-parser');
var fs = require('fs');

var fileToWrite = 'fixtures:\n';

fs.createReadStream('Anmeldungen_Testuser.csv')
    .pipe(csv({separator: ';'}))
    .on('data', function(data) {
        console.log(data.kundennummer.trim())
        fileToWrite += '  - model: maggs_customer\n';
        fileToWrite += '    data:\n';
        fileToWrite += '      card_id: \'' + data.kundennummer.trim() + '\'\n';
        fileToWrite += '      firstname: \'' + data.vorname.trim() + '\'\n';
        fileToWrite += '      lastname: \'' + data.name.trim() + '\'\n';
        fileToWrite += '      email: \'' + data.email.trim() + '\'\n';
        fileToWrite += '      gold_points: 1\n';

        fs.writeFile('fixtures/importedUsers.yml', fileToWrite);
    });