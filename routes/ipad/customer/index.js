var express = require('express');
var router = express.Router();
var dates = require('../../../helpers/dates');
var models = require('../../../models/index.js');
var Customer = models['maggs_customer'];
var Campaign = models['maggs_campaign'];
var GeoCampaign = models['maggs_geo_campaign'];
var UsedCoupon = models['maggs_used_coupon'];
var PushedCoupon = models['maggs_pushed_geo_coupon'];
var IpadInteraction = models['maggs_ipad_interaction'];
var findMethods = require('../../../models/findMethods');
var parse = require('../../../helpers/parse');
var analytics = require('../../../helpers/analytics');
var Store = models['maggs_store'];
var Beacon = models['maggs_beacon'];

var getStore = require('./get_store');

router.get('/', function (req, res) {
    //var store = getStore(req, res);
    //if (!store) return res.redirect('/employee/settings');
    //
    //return res.render('ipad/customer/home', {
    //    //welcomeText: store.welcomeText,
    //    //welcomeText: req.i18n.__('Welcome to store ' + store.name),
    //    pusherAppKey: process.env['pusherAppKey'],
    //    store: store
    //});

    if (!req.session.store_id) return res.redirect('/employee/settings');
    if (!req.session.beacon_id) return res.redirect('/employee/settings');
    Store.find(req.session.store_id)
        .then(function(store){
            if (!store) return res.redirect('/employee/settings');

            Beacon.find(req.session.beacon_id)
                .then(function(beacon){
                    if (!beacon) return res.redirect('/employee/settings');

                    return res.render('ipad/customer/home', {
                        //welcomeText: store.welcomeText,
                        //welcomeText: req.i18n.__('Welcome to store ' + store.name),
                        pusherAppKey: process.env['pusherAppKey'],
                        store: store,
                        beacon: beacon
                    });
                });
        })
        .catch(function(err){
            return res.status(500).send(err);
        });
});

router.get('/info/:id', function (req, res) {
    //var store = getStore(req, res);
    //if (!store) return res.redirect('/employee/settings');

    if (!req.session.store_id) return res.redirect('/employee/settings');
    Store.find(req.session.store_id)
        .then(function(store){
            if (!store) return res.redirect('/employee/settings');

            var message = req.session.message;
            req.session.message = null;
            var error = req.session.error;
            req.session.error = null;
            var customer_id = req.params.id;
            var last_access = {
                customer_id: (req.session.last_access) ? req.session.last_access.customer_id : null,
                time: (req.session.last_access) ? new Date(req.session.last_access.time) : null
            };
            Customer
                .find(customer_id)
                .success(function (customer) {
                    if (!customer) {
                        return res.render('ipad/customer/customer_notfound', {});
                    } else {


                        var qrCode = require('qrcode-npm');

                        var qr = qrCode.qrcode(2, 'M');
                        qr.addData(customer.card_id);
                        qr.make();

                        customer.qrcode = qr.createImgTag(5);

                        findMethods.getAllCampaignsByCustomerID(customer_id)
                            .success(function (all_used_coupons) {
                                var ids = [-1];
                                for (var i = 0; i < all_used_coupons.length; i++) {
                                    ids.push(all_used_coupons[i].campaign_id);
                                }
                                return findMethods.getActiveCampaigns(ids, store.id)
                                    .success(function (campaigns) {
                                        findMethods.getUnusedGeoCampaignsByCustomerID(customer_id)
                                            .success(function (pushed_geo_coupons) {
                                                for (var i = 0; i < pushed_geo_coupons.length; i++) {
                                                    campaigns.push(pushed_geo_coupons[i]);
                                                }
                                                campaigns.sort(findMethods.orderCustomerCouponList);
                                                res.locals.dayToString = dates.dayToString;
                                                var fiveminutesago = new Date();
                                                fiveminutesago.setMinutes(fiveminutesago.getMinutes() - 5);
                                                if (last_access.customer_id && last_access.customer_id == customer_id && last_access.time > fiveminutesago) {
                                                    return res.render('ipad/customer/coupon_list', {

                                                        store_id: store.id, // TODO: remove || 1 once value is guaranteed
                                                        //store_id: req.cookies.store_id || 1, // TEMPORARY

                                                        customer: customer,
                                                        store: store,
                                                        campaigns: campaigns,
                                                        message: message,
                                                        error: error
                                                    });
                                                }
                                                IpadInteraction
                                                    .create({
                                                        customer_id: customer_id,
                                                        store_id: store.id
                                                    })
                                                    .success(function () {
                                                        req.session.last_access = {
                                                            customer_id: customer_id,
                                                            time: new Date()
                                                        };
                                                        analytics.screenView(customer_id, 'POSApp / Customer / Coupons');

                                                        return res.render('ipad/customer/coupon_list', {
                                                            customer: customer,
                                                            campaigns: campaigns,
                                                            message: message,
                                                            error: error,
                                                            store: store
                                                        });
                                                    })
                                                    .error(function (err) {
                                                        console.error(err);
                                                        return err;
                                                    });

                                            })
                                            .error(function (err) {
                                                console.error(err);
                                                return err;
                                            });
                                    });
                            })
                            .error(function (err) {
                                console.error(err);
                                return err;
                            });
                    }
                });
        })
        .catch(function(err){
            return res.status(500).send(err);
        });
});

router.get('/:customer_id/redeem/:campaign_id/confirm', function (req, res) {
    //var store = getStore(req, res);
    //if (!store) return res.redirect('/employee/settings');

    if (!req.session.store_id) return res.redirect('/employee/settings');
    Store.find(req.session.store_id)
        .then(function(store){
            if (!store) return res.redirect('/employee/settings');

            var customer_id = req.params.customer_id;
            var campaign_id = req.params.campaign_id;
            var now = new Date();
            UsedCoupon
                .create({
                    campaign_id: campaign_id,
                    customer_id: customer_id,
                    store_id: store.id,
                    date: now
                })
                .success(function (used_coupon) {
                    req.session.message = req.i18n.__('Coupon successfully redeemed.');
                    Campaign.find(campaign_id)
                        .success(function (campaign) {
                            console.log('ANALYTICS');
                            analytics.couponRedemptionToAnalytics(customer_id, campaign.tagline, 'coupon-standard-' + campaign_id);
                            console.log('PARSE');
                            parse.pushRedeemCoupon(req, customer_id, campaign.tagline, 'campaign' + campaign_id);
                        })
                        .error(function (error) {
                            process.stdout.write(error);
                        });
                    return res.redirect('/customer/info/' + customer_id);
                })
                .error(function (err) {
                    req.session.error = req.i18n.__('Coupon not redeemed.');
                    return res.redirect('/customer/info/' + customer_id);
                });
        })
        .catch(function(err){
            return res.status(500).send(err);
        });

});

router.get('/:customer_id/redeem_geo/:campaign_id/confirm', function (req, res) {

    var customer_id = req.params.customer_id;
    var campaign_id = req.params.campaign_id;
    var now = new Date();
    PushedCoupon
        .find({
            where: {
                geo_campaign_id: campaign_id,
                customer_id: customer_id
            }
        })
        .success(function (used_coupon) {
            used_coupon.date = now;
            used_coupon.redeemed = true;
            used_coupon.save()
                .success(function (coupon) {
                    req.session.message = req.i18n.__('Coupon successfully redeemed.');
                    GeoCampaign.find(campaign_id)
                        .success(function (campaign) {
                            analytics.couponRedemptionToAnalytics(customer_id, campaign.tagline, 'coupon-geo-' + campaign_id);
                            parse.pushRedeemCoupon(req, customer_id, campaign.tagline, 'geoCampaign' + campaign_id);
                        })
                        .error(function (error) {
                            process.stdout.write(error);
                        });
                    return res.redirect('/customer/info/' + customer_id);
                })
                .error(function (err) {
                    req.session.error = req.i18n.__('Coupon not redeemed.');
                    return res.redirect('/customer/info/' + customer_id);
                });
        })
        .error(function (err) {
            req.session.error = req.i18n.__('Coupon not redeemed.');
            return res.redirect('/customer/info/' + customer_id);
        });
});

module.exports = router;