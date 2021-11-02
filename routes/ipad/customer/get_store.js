"use strict";

var Store = require('../../../models/index')['maggs_store'];


var store_ids = {};
var stores = {};

//Store.findAll({})
//    .then(function (records) {
//        for (var i = 0; i < records.length; i++) {
//            var record = records[i];
//            if (record.key) {
//                var store = {
//                    id: record.id,
//                    name: record.name,
//                    key: record.key,
//                    secret: record.secret,
//                    welcomeText: record.welcomeText
//                };
//                stores[store.id] = store;
//                store_ids[store.key] = store.id; // for lookup by key
//            }
//        }
//    });



function getStore(req, res) {
    Store.findAll({})
        .then(function (records) {
            for (var i = 0; i < records.length; i++) {
                var record = records[i];
                if (record.key) {
                    var store = {
                        id: record.id,
                        name: record.name,
                        key: record.key,
                        secret: record.secret,
                        welcomeText: record.welcomeText
                    };
                    stores[store.id] = store;
                    store_ids[store.key] = store.id; // for lookup by key
                }
            }
        });

    var result = {};

    // Store key specified ?
    if (req.query.store_key) {
        // Lookup the store ID
        console.log('Looking up store ID from store_key parameter:', req.query.store_key);
        if (!store_ids[req.query.store_key]) {
            res.statusCode = 400;
            res.write('Bad Request: unknown store_key specified');
            res.end();
            return;
        }
        result.id = store_ids[req.query.store_key];
        // Check the secret
        if (req.query.store_secret != stores[result.id].secret) {
            console.error("wrong/missing secret for the store");
            res.statusCode = 400;
            res.write('Bad Request: wrong/missing secret for the specified store');
            res.end();
            return;
        }
        // Store ID in cookies
        req.session.store_id = result.id;
    }
    else {
        // Get store ID from session
        console.log('Trying to get store ID from session data');
        if (!req.session.store_id) {
            //res.statusCode = 400;
            //res.write('Bad Request: no store ID found in session data, and no store key + secret specified');
            //res.end();

            console.log('Bad Request: no store ID found in session data, and no store key + secret specified');
            return false;
        }
        result.id = req.session.store_id;
    }

    // Lookup the store name & other data
    var store = stores[result.id];
    result.name = store.name;
    result.welcomeText = store.welcomeText;

    // DEBUGGING
    console.log('--------------');
    console.log('Store record:', result);
    console.log('--------------');

    return result;
}

module.exports = getStore;