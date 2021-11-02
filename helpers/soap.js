var soap = require('soap');
var crypto = require('crypto');

var data = {
    clientId: 6,
    passwordToken: {
        test: 'uDentOwMF5Aq',
        prod: 'e2VIF5eFaHv2he'
    }
};

var SPSConnection;

module.exports = {
    SPSConnect: function (req, options, callback) {
        var _this = this;

        if(!options.args) return callback('You must send some args...');

        if (SPSConnection) return _this[options.method](options.args, callback);

        soap.createClient(__dirname + '/ServiceMem.wsdl', {
            endpoint: 'https://service.swisspost.ch/Cert/CatalystMemService/ServiceMem.svc'
        }, function (err, client) {
            if (err) return callback(err);

            /*client.setSecurity(new soap.ClientSSLSecurity(
                __dirname + '/client.key'
                , __dirname + '/client.pem'

                , {}
            ));*/

            SPSConnection = client;
            return _this[options.method](options.args, callback);
        });

    },
    GetMemberInfo: function (args, callback) {
        if(!args.card_id) return callback('No card id sent');

        SPSConnection.wsdl.xmlnsInEnvelope = 'xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cat="http://www.swisspost.com/catalystSpsMem" xmlns:mem="http://www.swisspost.com/CatSpsWs/MemService"';

        var shasum = crypto.createHash('sha1');
        shasum.update(data.clientId + args.card_id + false + data.passwordToken.prod);
        var token = shasum.digest('hex');

        SPSConnection.GetMemberInfo({
            'cat:memberInfoRequest': {
                'mem:ClientId': 6,
                'mem:Id': args.card_id,
                'mem:IsMemberId': false,
                'mem:Token': token
            }
        }, function (err, response) {
            if (err) return callback(err);

            callback(null, response);
        });
    },
    GetDeviceInfo: function (args, callback) {
        if(!args.card_id) return callback('No card id sent');

        SPSConnection.wsdl.xmlnsInEnvelope = 'xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cat="http://www.swisspost.com/catalystSpsMem" xmlns:mem="http://www.swisspost.com/CatSpsWs/MemService"';

        var shasum = crypto.createHash('sha1');
        shasum.update(data.clientId + '0' + args.card_id + data.passwordToken.prod);
        var token = shasum.digest('hex');

        console.log(token);
        SPSConnection.GetDeviceInfo({
            'cat:deviceInfoRequest': {
                'mem:ClientId': 6,
                'mem:Cvc': null,
                'mem:DeviceId': args.card_id,
                'mem:DeviceType': 1,
                'mem:MemberId': 0,
                'mem:Status': 2,
                'mem:Token': token
            }
        }, function (err, response) {
            if (err) return callback(err);

            callback(null, response);
        });
    }
};