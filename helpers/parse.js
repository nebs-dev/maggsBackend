var https = require('https');
var i18n = new (require('i18n-2'))({locales: ['de']});
var PARSEURL = 'api.parse.com';
var _ = require('lodash');
var async = require('async');
var models = require('../models/index');

function pushNewCouponToAll(message, campaignId) {
    var jsonObject = JSON.stringify({
        "where": {
            "channels": {
                "$in": ["Coupons"]
            },
            "maggsCustomerId": {
                "$ne": "0"
            }
        },
        "data": {
            "alert": message,
            "badge": "1",
            "sound": "default",
            "actionType": "NewCoupon",
            "actionId": campaignId
        }
    });
    var postHeaders = {
        'X-Parse-Application-Id': process.env.parseAppID,
        'X-Parse-REST-API-Key': process.env.parseAPIKey,
        'Content-Type': 'application/json',
        'Content-Length' : Buffer.byteLength(jsonObject, 'utf8')
    };

    var postOptions = {
        host: PARSEURL,
        port: 443,
        path: '/1/push/',
        method: 'POST',
        headers: postHeaders
    };

    var reqPost = https.request(postOptions, function(postResponse) {
        postResponse.on('data', function(postData) {
            console.log(postData.toString());
        });
    });
    reqPost.write(jsonObject);
    reqPost.end();
    reqPost.on('error', function(e) {
        console.log(e);
    });
}

function pushGeoCouponToCustomer(req, customer_id, tagline, count, campaignId) {
    var jsonObject = JSON.stringify({
        "where": {
            "maggsCustomerId": customer_id.toString()
        },
        "data": {
            "alert": req.i18n.__("New coupon: ") + tagline,
            "badge": count,
            "sound": "default",
            "actionType": "NewCoupon",
            "actionId": campaignId
        }
    });
    var postHeaders = {
        'X-Parse-Application-Id': process.env.parseAppID,
        'X-Parse-REST-API-Key': process.env.parseAPIKey,
        'Content-Type': 'application/json',
        'Content-Length' : Buffer.byteLength(jsonObject, 'utf8')
    };

    var postOptions = {
        host: PARSEURL,
        port: 443,
        path: '/1/push/',
        method: 'POST',
        headers: postHeaders
    };

    var reqPost = https.request(postOptions, function(postResponse) {
        postResponse.on('data', function(postData) {
            console.log(postData.toString());
        });
    });
    reqPost.write(jsonObject);
    reqPost.end();
    reqPost.on('error', function(e) {
        console.log(e);
    });
}

function pushRedeemCoupon(req, customer_id, tagline, couponId) {
    var jsonObject = JSON.stringify({
        "where": {
            "maggsCustomerId": customer_id.toString()
        },
        "data": {
            "alert": req.i18n.__("Redeemed coupon: ") + tagline,
            "sound": "default",
            "actionType": "RedeemedCoupon",
            "actionId": couponId
        }
    });
    var postHeaders = {
        'X-Parse-Application-Id': process.env.parseAppID,
        'X-Parse-REST-API-Key': process.env.parseAPIKey,
        'Content-Type': 'application/json',
        'Content-Length' : Buffer.byteLength(jsonObject, 'utf8')
    };

    var postOptions = {
        host: PARSEURL,
        port: 443,
        path: '/1/push/',
        method: 'POST',
        headers: postHeaders
    };

    var reqPost = https.request(postOptions, function(postResponse) {
        postResponse.on('data', function(postData) {
            console.log(postData.toString());
        });
    });
    reqPost.write(jsonObject);
    reqPost.end();
    reqPost.on('error', function(e) {
        console.log(e);
    });
}

function createNewInstallation(req, res) {
    var customer_id     = req.body.customer_id.toString();
    var device_type     = req.body.device_type;
    var device_token    = req.body.device_token;
    var installation_id = req.body.installation_id;
    
    var jsonObject = JSON.stringify({
        "maggsCustomerId": customer_id,
        "deviceType": device_type,
        "deviceToken": device_token,
        "installationId": installation_id,
        "channels": ["Coupons", "Contests"]
    });
    console.log('createNewInstallation():', jsonObject);

    var postHeaders = {
        'Content-Type' : 'application/json',
        'Content-Length' : Buffer.byteLength(jsonObject, 'utf8'),
        'X-Parse-Application-Id': process.env.parseAppID,
        'X-Parse-REST-API-Key': process.env.parseAPIKey
    };

    var options = {
        host: PARSEURL,
        port: 443,
        path: '/1/installations',
        method: 'POST',
        headers: postHeaders
    };

    var reqPost = https.request(options, function(response) {
        response.on('data', function(postData) {
            postData = JSON.parse(postData.toString());
            if (typeof postData.error != 'undefined') {
                console.log(postData.error)
                res.statusCode = 500;
                res.write('APIErrorServerError');
                res.end();
            } else {
                res.statusCode = 200;
                res.write('');
                res.end();
            }
        });
    });

    reqPost.write(jsonObject);
    reqPost.end();
    reqPost.on('error', function(e) {
        console.log(e)
        res.statusCode = 500;
        res.write('APIErrorServerError');
        res.end();
    });
}

function deleteInstallation(req, res) {
    //var device_token = req.params.device_token;
    var object_id = req.params.object_id;
    //var getHeaders = {
    //    'X-Parse-Application-Id': process.env.parseAppID,
    //    'X-Parse-REST-API-Key': process.env.parseAPIKey
    //};

    //var getOptions = {
    //    host: PARSEURL,
    //    port: 443,
    //    path: '/1/installations?where=' + encodeURIComponent('{"deviceToken":"' + device_token + '"}'),
    //    method: 'GET',
    //    headers: getHeaders
    //};

    //var reqGet = https.request(getOptions, function(getResponse) {
    //    getResponse.on('data', function(getData) {
    //
    //        getData = JSON.parse(getData.toString());
    //
    //        if (!getData.error && getData.results && getData.results.length > 0) {
                var installationId = object_id;
                var deleteHeaders = {
                    'X-Parse-Application-Id': process.env.parseAppID,
                    'X-Parse-Master-Key': process.env.parseMasterKey
                };

                var deleteOptions = {
                    host: PARSEURL,
                    port: 443,
                    path: '/1/installations/' + installationId,
                    method: 'DELETE',
                    headers: deleteHeaders
                };

                var reqDelete = https.request(deleteOptions, function(deleteResponse) {
                    deleteResponse.on('data', function(deleteData) {
                        res.statusCode = 200;
                        res.write(deleteData);
                        res.end();
                    });
                });

                reqDelete.end();
                reqDelete.on('error', function(e) {
                    console.log(e)
                    res.statusCode = 500;
                    res.write('APIErrorServerError');
                    res.end();
                });
    //        } else {
    //            console.log(getData)
    //            res.statusCode = 500;
    //            if(getData.error) {
    //                res.write(getData.error);
    //            } else {
    //                res.write('APIErrorServerError');
    //            }
    //            res.end();
    //        }
    //    });
    //});
    //
    //reqGet.end();
    //reqGet.on('error', function(e) {
    //    console.log(e)
    //    res.statusCode = 500;
    //    res.write('APIErrorServerError');
    //    res.end();
    //});
}

function pushThankyouFeedback(customer_id, store_id, message, feedback) {
    var pushType = (feedback) ? 'ThankyouFeedback' : 'ThankyouMessage';

    var jsonObject = JSON.stringify({
        "where": {
            "maggsCustomerId": customer_id.toString()
        },
        "data": {
            "alert": message,
            "sound": "default",
            "actionType": pushType,
            "actionId": store_id
        }
    });
    var postHeaders = {
        'X-Parse-Application-Id': process.env.parseAppID,
        'X-Parse-REST-API-Key': process.env.parseAPIKey,
        'Content-Type': 'application/json',
        'Content-Length' : Buffer.byteLength(jsonObject, 'utf8')
    };

    var postOptions = {
        host: PARSEURL,
        port: 443,
        path: '/1/push/',
        method: 'POST',
        headers: postHeaders
    };

    var reqPost = https.request(postOptions, function(postResponse) {
        postResponse.on('data', function(postData) {
            console.log(postData.toString());
        });
    });
    reqPost.write(jsonObject);
    reqPost.end();
    reqPost.on('error', function(e) {
        console.log(e);
    });
}

/**
 * Customer level up push
 * @param customer
 */
function pushLevelUp(customer, message) {
    var jsonObject = JSON.stringify({
        "where": {
            "maggsCustomerId": customer.id.toString()
        },
        "data": {
            "alert": message,
            "sound": "default",
            "actionType": "LevelUp"
        }
    });

    var postHeaders = {
        'X-Parse-Application-Id': process.env.parseAppID,
        'X-Parse-REST-API-Key': process.env.parseAPIKey,
        'Content-Type': 'application/json',
        'Content-Length' : Buffer.byteLength(jsonObject, 'utf8')
    };

    var postOptions = {
        host: PARSEURL,
        port: 443,
        path: '/1/push/',
        method: 'POST',
        headers: postHeaders
    };

    var reqPost = https.request(postOptions, function(postResponse) {
        postResponse.on('data', function(postData) {
            console.log(postData.toString());
        });
    });
    reqPost.write(jsonObject);
    reqPost.end();
    reqPost.on('error', function(e) {
        console.log(e);
    });
}

/**
 * Contest entry jump to first place push
 * @param customer
 * @param message
 */
function pushEntryFirstPlace(customer, message) {
    var jsonObject = JSON.stringify({
        "where": {
            "maggsCustomerId": customer.id.toString()
        },
        "data": {
            "alert": message,
            "sound": "default",
            "actionType": "EntryFirstPlace"
        }
    });
    var postHeaders = {
        'X-Parse-Application-Id': process.env.parseAppID,
        'X-Parse-REST-API-Key': process.env.parseAPIKey,
        'Content-Type': 'application/json',
        'Content-Length' : Buffer.byteLength(jsonObject, 'utf8')
    };
    var postOptions = {
        host: PARSEURL,
        port: 443,
        path: '/1/push/',
        method: 'POST',
        headers: postHeaders
    };

    var reqPost = https.request(postOptions, function(postResponse) {
        postResponse.on('data', function(postData) {
            console.log(postData.toString());
        });
    });
    reqPost.write(jsonObject);
    reqPost.end();
    reqPost.on('error', function(e) {
        console.log(e);
    });
}

function pushNewContestToAll(message, contestId) {
    var jsonObject = JSON.stringify({
        "where": {
            "channels": {
                "$in": ["Contests"]
            },
            "maggsCustomerId": {
                "$ne": "0"
            }
        },
        "data": {
            "alert": message,
            "badge": "1",
            "sound": "default",
            "actionType": "ContestStart",
            "actionId": contestId
        }
    });
    var postHeaders = {
        'X-Parse-Application-Id': process.env.parseAppID,
        'X-Parse-REST-API-Key': process.env.parseAPIKey,
        'Content-Type': 'application/json',
        'Content-Length' : Buffer.byteLength(jsonObject, 'utf8')
    };

    var postOptions = {
        host: PARSEURL,
        port: 443,
        path: '/1/push/',
        method: 'POST',
        headers: postHeaders
    };

    var reqPost = https.request(postOptions, function(postResponse) {
        postResponse.on('data', function(postData) {
            console.log(postData.toString());
        });
    });
    reqPost.write(jsonObject);
    reqPost.end();
    reqPost.on('error', function(e) {
        console.log(e);
    });
}


function pushEndContest(message, contestId) {
    var sql = 'SELECT c.id FROM maggs_contest_entries e ' +
        'INNER JOIN maggs_customers c ON e.customer_id = c.id ' +
        'WHERE e.contest_id = '+parseInt(contestId)+' AND e.photo IS NOT NULL GROUP BY c.id';

    // find cutomers on this contest
    models.sequelize.query(sql).then(function (customers) {
        if(customers.length) {

            // send push to every customer on this contest
            async.each(customers, function (customer, callback) {
                var jsonObject = JSON.stringify({
                    "where": {
                        "maggsCustomerId": customer.id.toString()
                    },
                    "data": {
                        "alert": message,
                        "sound": "default",
                        "actionType": "ContestEnd"
                    }
                });
                var postHeaders = {
                    'X-Parse-Application-Id': process.env.parseAppID,
                    'X-Parse-REST-API-Key': process.env.parseAPIKey,
                    'Content-Type': 'application/json',
                    'Content-Length' : Buffer.byteLength(jsonObject, 'utf8')
                };
                var postOptions = {
                    host: PARSEURL,
                    port: 443,
                    path: '/1/push/',
                    method: 'POST',
                    headers: postHeaders
                };

                var reqPost = https.request(postOptions, function(postResponse) {
                    postResponse.on('data', function(postData) {
                        console.log(postData.toString());
                    });
                });

                reqPost.write(jsonObject);
                reqPost.end();
                reqPost.on('error', function(e) {
                    callback(e);
                });

                callback();

            }, function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('OK');
                }
            });
        }
    })
    .catch(function(err){
        console.log(err);
    });
}

module.exports = {
    pushNewCouponToAll: pushNewCouponToAll,
    deleteInstallation: deleteInstallation,
    createNewInstallation: createNewInstallation,
    pushGeoCouponToCustomer: pushGeoCouponToCustomer,
    pushRedeemCoupon: pushRedeemCoupon,
    pushThankyouFeedback: pushThankyouFeedback,
    pushLevelUp: pushLevelUp,
    pushEntryFirstPlace: pushEntryFirstPlace,
    pushNewContestToAll: pushNewContestToAll,
    pushEndContest: pushEndContest
}