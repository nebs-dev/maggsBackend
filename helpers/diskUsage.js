var exec = require("child_process").exec;
var mailer = require('../helpers/mailer');
var _ = require('lodash');


module.exports = {
    checkUsage: function (email, callback) {
        exec('df', function (error, stdout, stderr) {
            if (stderr || error) {
                return callback && callback(stderr || error);
            }

            var usage = stdout;
            var regex = /^\/.+?(\d+)%\s(.+)/gm;

            var match;
            var errors = [];

            while (match = regex.exec(usage)) {
                var percent = parseInt(match[1]);
                if (percent > 80) {
                    errors.push({percent: percent, path: match[2]});
                }
            }

            if (!email) {
                if(errors.length) {
                    console.warn('WARNUNG SPEICHERPLATZ FAST VOLL!!!', errors);
                }
                return callback && callback();

            } else {
                if(errors.length) {
                    var protocol = req.connection.encrypted ? 'https' : 'http';
                    var baseUrl = protocol + '://' + req.headers.host + '/';

                mailer.sendEmail({
                    template: 'diskUsage',
                    to: email,
                    subject: 'MAGGS BACKEND WARNUNG - SPEICHERPLATZ'
                }, {
                    errors: errors,
                    baseUrl: baseUrl
                }, function (err, msg) {
                    if (err) return callback && callback(err);

                    return callback && callback();
                });
            } else {
                    return callback && callback();
                }
            }

        });
    }
};