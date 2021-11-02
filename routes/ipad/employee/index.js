var express = require('express');
var router = express.Router();
var models = require('../../../models/index.js');
var Customer = models['maggs_customer'];
var IpadInteraction = models['maggs_ipad_interaction'];
var Campaign = models['maggs_campaign'];
var Store = models['maggs_store'];
var GeoCampaign = models['maggs_geo_campaign'];
var Beacon = models['maggs_beacon'];
var ThankyouMessage = models['maggs_thankyou_message'];
var ThankyouMessageModel = models['maggs_thankyou_message_model'];
var Feedback = models['maggs_feedback'];
var FeedbackAnswer = models['maggs_feedback_answer'];
var CustomerFeedback = models['maggs_customer_feedback'];
var findMethods = require('../../../models/findMethods');
var dates = require('../../../helpers/dates');
var formValidators = require('../../../helpers/formValidators');
var parse = require('../../../helpers/parse');
var strings = require('../../../helpers/strings');
var schedule = require('node-schedule');
var moment = require('moment');
var _ = require('lodash');
var excelHelper = require('../../../helpers/excelGenerate');
var async = require('async');
var IpadInteraction = models['maggs_ipad_interaction'];

var getStore = require('../customer/get_store');

router.get('/', function (req, res) {
    //if (!req.session.store_id) return res.redirect('/employee/settings');
    //var store = getStore(req, res);

    if (!req.session.store_id) return res.redirect('/employee/settings');
    Store.find(req.session.store_id)
        .then(function(store){
            if (!store) return res.redirect('/employee/settings');

            var error = req.session.error;
            req.session.error = null;
            return res.render('ipad/employee/home', {error: error});
        })
        .catch(function(err){
            return res.status(500).send(err);
        });
});

router.get('/history', function (req, res) {
    //if (!req.session.store_id) return res.redirect('/employee/settings');
    //var store = getStore(req, res);

    if (!req.session.store_id) return res.redirect('/employee/settings');
    Store.find(req.session.store_id)
        .then(function(store){
            if (!store) return res.redirect('/employee/settings');

            var lastMonth = new Date();
            lastMonth.setDate(lastMonth.getDate() - 30);
            IpadInteraction
                .findAll({
                    where: {
                        store_id: store.id,
                        createdAt: {
                            gte: lastMonth
                        }

                    },
                    order: '"createdAt" DESC',
                    include: [
                        {model: Customer},
                        {model: ThankyouMessage}
                    ]
                })
                .success(function (ipadInteractions) {
                    res.locals.timeToString = dates.timeToString;
                    res.locals.dayOfTheWeek = dates.dayOfTheWeek;
                    ipadInteractions = dates.groupInteractionsByDay(ipadInteractions);
                    return res.render('ipad/employee/history', {days: ipadInteractions});
                })
                .error(function (err) {
                    req.session.error = req.i18n.__('Unknown error');
                    return res.redirect('/employee');
                });
        })
        .catch(function(err){
            return res.status(500).send(err);
        });
});

router.get('/coupons', function (req, res) {
    //var now = new Date();
    var now = moment().format('YYYY-MM-DD HH:mm:ss+02');
    //if (!req.session.store_id) return res.redirect('/employee/settings');
    //var store = getStore(req, res);

    if (!req.session.store_id) return res.redirect('/employee/settings');
    Store.find(req.session.store_id)
        .then(function(store){
            if (!store) return res.redirect('/employee/settings');

            models.sequelize
                .query(
                "SELECT * " +
                "FROM maggs_campaigns c " +
                "LEFT JOIN campaign_store cs ON cs.campaign_id = c.id " +
                "WHERE c.end_date > '" + now + "' AND cs.store_id = " + store.id + " " +
                "ORDER BY c.end_date ASC ;"
            )

                .success(function (campaigns) {
                    GeoCampaign
                        .findAll({
                            where: {
                                end_date: {
                                    gt: now
                                }
                            },
                            order: 'end_date ASC'
                        })
                        .success(function (geo_campaigns) {
                            res.locals.dayToString = dates.dayToString;
                            return res.render('ipad/employee/coupons', {campaigns: campaigns, geo_campaigns: geo_campaigns});
                        })
                        .error(function (err) {
                            req.session.error = req.i18n.__('Unknown error');
                            return res.redirect('/employee');
                        });
                })
                .error(function (err) {
                    req.session.error = req.i18n.__('Unknown error');
                    return res.redirect('/employee');
                });
        })
        .catch(function(err){
            return res.status(500).send(err);
        });
});

router.get('/customer/:ipadinteraction/:customer', function (req, res) {
    //if (!req.session.store_id) return res.redirect('/employee/settings');
    //var store = getStore(req, res);

    if (!req.session.store_id) return res.redirect('/employee/settings');
    Store.find(req.session.store_id)
        .then(function(store){
            if (!store) return res.redirect('/employee/settings');

            var message = req.session.success;
            req.session.success = null;
            var customer_id = req.params.customer;
            var ipadInteraction_id = req.params.ipadinteraction;
            Customer
                .find(customer_id)
                .success(function (customer) {
                    if (!customer) {
                        return res.render('ipad/customer/customer_notfound', {});
                    } else {
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
                                                res.locals.dateToString = dates.dateToString;
                                                res.locals.dayToString = dates.dayToString;
                                                res.locals.minutesDiff = dates.minutesDiff;
                                                findMethods.getRedeemedCampaignsByCustomerID(customer_id)
                                                    .success(function (redeemed_campaigns) {
                                                        ThankyouMessage
                                                            .find({
                                                                where: {
                                                                    ipad_interaction_id: ipadInteraction_id
                                                                },
                                                                include: [
                                                                    {model: IpadInteraction}
                                                                ]
                                                            })
                                                            .success(function (thankyou_message) {
                                                                IpadInteraction
                                                                    .find(ipadInteraction_id)
                                                                    .success(function (ipadInteraction) {
                                                                        ThankyouMessageModel
                                                                            .findAll()
                                                                            .success(function (thankyou_message_models) {
                                                                                res.locals.shortenString = strings.shortenString;
                                                                                //console.log('redeemed_campaigns:', redeemed_campaigns);
                                                                                return res.render('ipad/employee/customer', {
                                                                                    inputs: customer,
                                                                                    campaigns: campaigns,
                                                                                    redeemed_campaigns: redeemed_campaigns,
                                                                                    ipadInteraction: ipadInteraction,
                                                                                    delay: process.env.pushDelay,
                                                                                    message: message,
                                                                                    thankyou_message: thankyou_message,
                                                                                    models: thankyou_message_models
                                                                                });
                                                                            })
                                                                            .error(function (err) {
                                                                                return err;
                                                                            });
                                                                    })
                                                                    .error(function (err) {
                                                                        return err;
                                                                    });
                                                            })
                                                            .error(function (err) {
                                                                return err;
                                                            });
                                                    })
                                                    .error(function (err) {
                                                        return err;
                                                    });

                                            })
                                            .error(function (err) {
                                                return err;
                                            });
                                    });
                            })
                            .error(function (err) {
                                return err;
                            });
                    }
                });
        })
        .catch(function(err){
            return res.status(500).send(err);
        });
});

router.post('/customer/edit/', function (req, res) {
    var errors = formValidators.validateEditCustomer(req);
    var customer_id = req.body.id;
    var ipad_interaction_id = req.body.ipad_interaction_id;
    if (errors) {
        return res.render('ipad/employee/customer', {inputs: req.body});
    }
    Customer
        .find(customer_id)
        .success(function (customer) {
            customer.hints = req.body.hints;
            customer.save()
                .success(function (customer) {
                    req.session.success = req.i18n.__('Your information has been saved');
                    return res.redirect('/employee/customer/' + ipad_interaction_id + '/' + customer_id);
                })
                .error(function (err) {
                    req.session.error = req.i18n.__('Unknown error');
                    return res.redirect('/employee');
                });
        })
        .error(function (err) {
            req.session.error = req.i18n.__('Unknown error');
            return res.redirect('/employee');
        });
});

router.post('/thankyou/:ipad_interaction_id/:customer_id', function (req, res) {
    var ipad_interaction_id = req.params.ipad_interaction_id;
    var customer_id = req.params.customer_id;
    var message = req.body.message;
    var delay = parseInt(req.body.delay);
    var feedback = (req.body.feedback) ? true : false;

    if(!ipad_interaction_id || !customer_id) return res.redirect('/employee');

    IpadInteraction.find({where: {'id': ipad_interaction_id}}).then(function (interaction) {

        var callback = function () {
            new parse.pushThankyouFeedback(customer_id, interaction.store_id, message, feedback);
        };
        var scheduledDate = new Date();
        scheduledDate.setMinutes(scheduledDate.getMinutes() + delay);
        new schedule.scheduleJob('thankYou_' + customer_id, scheduledDate, callback);

        return ThankyouMessage
            .create({
                scheduled_date: scheduledDate,
                message: message,
                customer_id: customer_id,
                ipad_interaction_id: ipad_interaction_id,
                feedback: feedback
            })
            .then(function (message) {
                req.session.success = req.i18n.__('Your message has been scheduled');
                return res.redirect('/employee/customer/' + ipad_interaction_id + '/' + customer_id);
            })


    }).catch(function (err) {
        req.session.error = req.i18n.__('Unknown error');
        return res.redirect('/employee/customer/' + ipad_interaction_id + '/' + customer_id);
    });


});

function createDataForChart(feedbacks, dateCondition) {
    var results = [];
    for (var i in feedbacks) {
        var feedback = feedbacks[i];
        var count = [];
        var percentage = [];
        var maxCount = 0;
        var maxPercentage = 0;
        var answers = feedback.maggsFeedbackAnswers.filter(function (answer) {
            return answer.createdAt > dateCondition;
        });
        var total = answers.length;
        for (var j = 0; j < feedback.Question1Answers.length; j++) {
            count.push(0);
            percentage.push(0);
        }
        for (j in answers) {
            var answer = answers[j];
            count[answer.Answer1] += 1;
            percentage[answer.Answer1] = Math.round(count[answer.Answer1] / total * 1000) / 10;
            if (maxCount < count[answer.Answer1]) {
                maxCount = count[answer.Answer1];
            }
            if (maxPercentage < percentage[answer.Answer1]) {
                maxPercentage = percentage[answer.Answer1];
            }
        }
        results[feedback.id] = {
            count: count,
            maxCount: maxCount,
            maxPercentage: maxPercentage,
            percentage: percentage,
            total: total
        };
    }
    return results;
}


router.route('/xlsx').get(function (req, res) {
    Store.findAll({})
        .then(function (stores) {

            async.eachSeries(stores, function (store, cb) {
                excelHelper.storeFeedback(store.id, function (err) {
                    if (err) return cb(err);
                    cb();
                });

            }, function (err) {
                if (err) return res.status(500).json(err);
                res.json("lega sve gotovo!");

            });

        })
        .catch(function (err) {
            res.json(err);
        });
});


router.get('/statistics', function (req, res) {
    //if (!req.session.store_id) return res.redirect('/employee/settings');
    //var store = getStore(req, res);
    var now = moment().format('YYYY-MM-DD');

    if (!req.session.store_id) return res.redirect('/employee/settings');
    Store.find(req.session.store_id)
        .then(function(store){
            if (!store) return res.redirect('/employee/settings');

            CustomerFeedback.findAll({
                where: {store_id: store.id},
                order: '"createdAt" DESC',
                include: [
                    {model: Customer, as: 'Customer'}
                ]
            }).then(function (feedbacks) {
                if (!feedbacks || !feedbacks.length) return res.render('ipad/employee/statistics', {
                    feedbacks: null,
                    error: req.i18n.__('Unknown error')
                });


                var claims = _.groupBy(feedbacks, 'claim');
                var feeds = [];
                //
                //for (var claim in claims) {
                //    var ratings = _.countBy(_.pluck(claims[claim], 'rating'));
                //    feeds.push({key: claim, data: claims[claim], total: claims[claim].length, ratings: ratings});
                //}

                // Todays statistics
                var today =  _.filter(feedbacks, function(obj) {
                    var createdAt = moment(obj.selectedValues.createdAt).format('YYYY-MM-DD');
                    return (createdAt == now) ? obj : false;
                });

                var ratings = _.countBy(_.pluck(today, 'rating'));
                feeds.push({key: 'Heute', data: today, total: today.length, ratings: ratings});


                // Past week statistics
                var pastWeekDate = new Date();
                pastWeekDate.setDate(pastWeekDate.getDate() - 7);
                pastWeekDate = moment(pastWeekDate).format('YYYY-MM-DD');
                var week = _.filter(feedbacks, function(obj) {
                    var createdAt = moment(obj.selectedValues.createdAt).format('YYYY-MM-DD');
                    return (createdAt <= now && createdAt >= pastWeekDate) ? obj : false;
                });

                var ratings = _.countBy(_.pluck(week, 'rating'));
                feeds.push({key: 'LetzteWoche', data: week, total: week.length, ratings: ratings});


                // Past month statistics
                var pastMonthDate = new Date();
                pastMonthDate.setDate(pastMonthDate.getDate() - 30);
                pastMonthDate = moment(pastMonthDate).format('YYYY-MM-DD');
                var month = _.filter(feedbacks, function(obj) {
                    var createdAt = moment(obj.selectedValues.createdAt).format('YYYY-MM-DD');
                    return (createdAt <= now && createdAt >= pastMonthDate) ? obj : false;
                });

                var ratings = _.countBy(_.pluck(month, 'rating'));
                feeds.push({key: 'LetztenMonat', data: month, total: month.length, ratings: ratings});


                res.locals.dateToString = dates.dateToString;
                return res.render('ipad/employee/statistics', {
                    feedbacks: feeds,
                    messages: feedbacks
                });
            });
        })
        .catch(function(err){
            return res.status(500).send(err);
        });


    // todo old way ... before ranking 1-5 delete if not needed
    /*var today = new Date();
     today.setHours(0);
     today.setMinutes(0);
     today.setSeconds(0);
     Feedback
     .findAll({
     where: {store_id: store.id},
     order: '"createdAt" DESC',
     include: [
     {model: FeedbackAnswer}
     ]
     })
     .success(function (feedbacks) {
     console.log(feedbacks);
     resultsToday = createDataForChart(feedbacks, today);
     resultsLastWeek = createDataForChart(feedbacks, today.setDate(today.getDate() - 7));
     resultsLastMonth = createDataForChart(feedbacks, today.setDate(today.getDate() - 23));
     FeedbackAnswer.
     findAll({
     where: {
     Answer2: {
     ne: ''
     },

     },
     order: '"createdAt" DESC',
     include: [
     {model: Feedback}
     ]
     })
     .success(function (messages) {
     for (var i in messages) {
     var message = messages[i];
     }
     res.locals.dayToString = dates.dayToString;
     res.locals.JSON = JSON;
     return res.render('ipad/employee/statistics', {feedbacks: feedbacks, resultsToday: resultsToday, resultsLastWeek: resultsLastWeek, resultsLastMonth: resultsLastMonth, messages: messages});
     })
     })
     .error(function (err) {
     return res.render('ipad/employee/statistics', {feedbacks: null, error: req.i18n.__('Unknown error')});
     });*/
});


router.get('/settings', function (req, res) {
    Store.findAll({})
        .then(function (stores) {

            async.each(stores, function (store, callback) {
                //store.beacons = [];

                Beacon.findAll({where: {store_id: store.id, cash_register: true}})
                    .then(function (beacons) {
                        store.beacons = beacons;
                        callback();
                    }).catch(function (err) {
                        callback(err)
                    });

            }, function (err) {
                if (err) {
                    return res.send(err);
                } else {
                    //console.log(stores);
                    return res.render('ipad/employee/settings', {stores: stores, store_id: req.session.store_id});
                }
            });
        })
        .catch(function (err) {
            return res.send(err);
        });
});

router.get('/add_store/:id/:beaconID/:secret', function (req, res) {
    Store.find({
        where: {'id': req.params.id, 'secret': req.params.secret}
    })
        .then(function (store) {
            var error = 'No stores with id ' + req.params.id + ' and secret ' + req.params.secret;
            if (!store) {
                req.session.destroy();
                return res.render('ipad/employee/error', {error: error});
            }

            req.session.store_id = req.params.id;
            req.session.beacon_id = req.params.beaconID;
            return res.redirect('/customer');

        }).catch(function (err) {
            return res.send(err);
        });
});

module.exports = router;