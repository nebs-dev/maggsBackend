var express = require('express');
var Pusher = require('pusher');
var router = express.Router();
var https = require('https');
var models = require('../../models/index.js');
var Campaign = models['maggs_campaign'];
var Beacon = models['maggs_beacon'];
var Store = models['maggs_store'];
var PushedGeoCoupon = models['maggs_pushed_geo_coupon'];
var Customer = models['maggs_customer'];
var randomString = require('../../helpers/random')['randomString'];
var findMethods = require('../../models/findMethods');
var parse = require('../../helpers/parse');

/* TEMPORARY: hardcoded beacon table, implemented as a two-dimensional index [major][minor].
 TODO: use a database table for lookup
 */
var beacons =  {
    999: { 999: { location_type: 'cash_register' } }
};

/* We create and configure our Pusher.com client object:
 */
var pusher = function() {

    var p = {
        appId: process.env['pusherAppID'],
        key: process.env['pusherAppKey'],
        secret: process.env['pusherAppSecret']
    };
    if (!p.appId || !p.key || !p.secret) throw Error("You must set the environment variables pusherAppID, pusherAppKey and pusherAppSecret (for pusher.com)!");

    return new Pusher(p);
}();

router.route('/locationUpdate')
    .post(function (req, res) {
        console.log('*********START: API/locationUpdate*********')
        var customer_id = req.body.customer_id ? parseInt(req.body.customer_id) : parseInt(req.query.customer_id);

        var major = req.body.major ? parseInt(req.body.major) : parseInt(req.query.major);
        var minor = req.body.minor ? parseInt(req.body.minor) : parseInt(req.query.minor);
        var store_id = req.body.store_id ? parseInt(req.body.store_id) : parseInt(req.query.store_id);
        var onComplete = function () {
            res.statusCode = 200;
            res.end();
            console.log('success on locationUpdate');
            console.log('*********END: API/locationUpdate*********');
        }
        //console.log('customerId: ' + customer_id);

        Beacon.find({where: {
            minor: minor,
            major: major,
            store_id: store_id
        }})
            .then(function(beacon){
                if(!beacon) return res.status(404).json('APIBeaconNotFound');

                // Check beacon type
                if (beacon.cash_register) {
                    Store.find({
                        where: {id: store_id}
                    })
                        .then(function(store){
                            if(!store) return res.status(404).json('APIStoreNotFound');

                            pusher.trigger('store-'+process.env.server_instance+'-'+store.id+'-'+beacon.id, 'customer@cash_register', {"customer_id": customer_id});

                            onComplete();
                        })
                        .catch(function(err){
                            res.status(500).json('APIErrorServerError');
                        });
                }
                else {
                    // Get the geo coupons that have been "pushed" to this customer
                    models.sequelize
                        .query(
                        "SELECT * " +
                        "FROM maggs_pushed_geo_coupons " +
                        "WHERE customer_id = " + customer_id + ";"
                    )
                        .success(function (pushedCoupons) {
                            var pushedCouponIds = [];
                            for (var i in pushedCoupons) {
                                pushedCouponIds.push(pushedCoupons[i].geo_campaign_id);
                            }

                            if (beacon) {
                                // Find all the currently active geo campaigns at this location
                                models.sequelize
                                    .query(
                                    "SELECT * FROM maggs_geo_campaigns " +
                                    "WHERE beacon_ids @> '{" + beacon.id + "}' " +
                                    "AND start_date <= CURRENT_TIMESTAMP " +
                                    "AND end_date > CURRENT_TIMESTAMP;"
                                )
                                    .success(function (geo_campaigns) {
                                        if (geo_campaigns.length > 0) {
                                            var notificationCount = 0;
                                            // Check each campaign against the list of coupons pushed to this customer
                                            var keysLength = geo_campaigns.length;
                                            Object.keys(geo_campaigns).forEach(function(key) {
                                                var geo_campaign = geo_campaigns[key];
                                                // This campaign not yet pushed to this customer ?
                                                if (pushedCouponIds.indexOf(geo_campaign.id) == -1) {
                                                    pushedCouponIds.push(geo_campaign.id);
                                                    notificationCount++;
                                                    console.log("No.")
                                                    // Add this geo campaign to the list of pushed coupons for this customer
                                                    PushedGeoCoupon
                                                        .create({
                                                            beacon_id: beacon.id,
                                                            customer_id: customer_id,
                                                            geo_campaign_id: geo_campaign.id,
                                                            date: new Date(),
                                                            redeemed: false
                                                        })
                                                        .success(function (coupon) {
                                                            // req: only needed to call i18n (to translate introductory string)
                                                            parse.pushGeoCouponToCustomer(req, customer_id, geo_campaign.tagline, notificationCount, 'coupon-geo-' + geo_campaign.id);
                                                            if (--keysLength === 0) {
                                                                // No tasks left, good to go
                                                                onComplete();
                                                            }
                                                        })
                                                        .error(function (error) {
                                                            res.statusCode = 500;
                                                            res.write('APIErrorServerError');
                                                            res.end();
                                                            console.log('error on locationUpdate');
                                                            console.log('*********END: API/locationUpdate*********');
                                                        });
                                                } else {
                                                    if (--keysLength === 0) {
                                                        // No tasks left, good to go
                                                        onComplete();
                                                    }
                                                    console.log("Yes.")
                                                }
                                            });
                                        } else {
                                            res.statusCode = 200;
                                            res.end();
                                            console.log('success on locationUpdate');
                                            console.log('*********END: API/locationUpdate*********');
                                        }
                                    })
                                    .error(function (error) {
                                        res.statusCode = 500;
                                        res.write('APIErrorServerError');
                                        res.end();
                                        console.log('error on locationUpdate');
                                        console.log('*********END: API/locationUpdate*********');
                                    });
                            } else {
                                res.statusCode = 200;
                                res.end();
                                console.log('success on locationUpdate');
                                console.log('*********END: API/locationUpdate*********');
                            }

                        });

                } // else: NOT cash register

            })
            .catch(function(err){
                res.status(500).json('APIErrorServerError');
            });
    });

router.route('/notification')
    .post(function(req, res) {
        var customer_id = parseInt(req.body.customer_id);

        Customer
            .find(customer_id)
            .success(function (customer) {
                if (customer || customer_id == 0) {
                    parse.createNewInstallation(req, res);
                } else {
                    res.statusCode = 500;
                    res.write('APIErrorServerError');
                    res.end();
                }
            })
            .error(function (e) {
                console.error(e);
                res.statusCode = 500;
                res.write('APIErrorServerError');
                res.end();
            });
    });

router.route('/notification/:object_id')
    .delete(function(req, res) {
        parse.deleteInstallation(req, res);
    });

router.route('/beacons')
    .get(function(req, res) {
        Beacon.findAll().then(function(beacons) {
            res.json(beacons);
        }).catch(function(err) {
            res.status(500).json(err);
        });
    });

module.exports = router;