var models = require('./index.js');
var Campaign = models['maggs_campaign'];
var UsedCoupons = models['maggs_used_coupon'];
var PushedGeoCoupons = models['maggs_pushed_geo_coupon'];
var ThankyouMessage = models['maggs_thankyou_message'];
var Contests = models['maggs_contest'];
var moment = require('moment');
var async = require('async');
var _ = require('lodash');

module.exports = {
    orderCustomerCouponList: function (a, b) {
        if (a.end_date > b.end_date) {
            return 1;
        } else {
            return -1;
        }
    },
    orderCouponList: function (a, b) {
        var aStatus = null;
        var bStatus = null;
        var aRedeemedDate = null;
        var bRedeemedDate = null;
        if (a.dataValues) {
            aStatus = a.dataValues['status'];
            aRedeemedDate = a.dataValues['redeemed_date'];
        } else {
            aStatus = a['status'];
            aRedeemedDate = a['redeemed_date'];
        }
        if (b.dataValues) {
            bStatus = b.dataValues['status'];
            bRedeemedDate = b.dataValues['redeemed_date'];
        } else {
            bStatus = b['status'];
            bRedeemedDate = b['redeemed_date'];
        }

        if (aStatus < bStatus) {
            if ((aStatus == 1 || aStatus == 2) && (bStatus == 1 || bStatus == 2)) {
                if (a.end_date > b.end_date) {
                    return 1;
                } else {
                    return -1;
                }
            } else {
                return -1;
            }
        } else if (aStatus > bStatus) {
            if ((aStatus == 1 || aStatus == 2) && (bStatus == 1 || bStatus == 2)) {
                if (a.end_date > b.end_date) {
                    return 1;
                } else {
                    return -1;
                }
            } else {
                return 1;
            }
        } else {
            if (!aRedeemedDate) {
                if (a.end_date > b.end_date) {
                    return 1;
                } else {
                    return -1;
                }
            } else {
                if (aRedeemedDate > bRedeemedDate) {
                    return 1;
                } else {
                    return -1;
                }
            }
        }
    },
    getNotLaunchedCampaigns: function () {
        var now = new Date();
        return Campaign
            .findAll({
                where: {
                    launch_date: {
                        gt: now
                    }
                }
            });
    },

    getPushContestsStart: function () {
        var now = moment().format('YYYY-MM-DD HH:mm:ss+02');
        var sql = "SELECT * FROM maggs_contests WHERE start_date >= '" +now+ "';";

        return models.sequelize
            .query(sql);
    },

    getPushContestsEnd: function () {
        var now = moment().format('YYYY-MM-DD HH:mm:ss+02');
        var sql = "SELECT * FROM maggs_contests WHERE end_date >= '" +now+ "';";

        return models.sequelize
            .query(sql);
    },


    getActiveCampaigns: function (id_list, store_id) {
        var now = moment().format('YYYY-MM-DD HH:mm:ss+02');
        //var now = new Date();
        var id_list_array = id_list.join(',');

        var sql = "SELECT * " +
            "FROM maggs_campaigns c " +
            "INNER JOIN campaign_store cs ON cs.campaign_id = c.id " +
            "WHERE c.id NOT IN (" + id_list_array + ") " +
            "AND c.launch_date <= '" + now + "' AND c.start_date <= '" + now + "' AND c.end_date > '" + now + "' " +
            "AND cs.store_id = " + store_id + ";";

        return models.sequelize
            .query(sql);

        //return Campaign
        //    .findAll({
        //        where: {
        //            id: {
        //                not: id_list
        //            },
        //            launch_date: {
        //                lte: now
        //            },
        //            start_date: {
        //                lte: now
        //            },
        //            end_date: {
        //                gt: now
        //            }
        //        },
        //        order: 'end_date ASC'
        //    });
    },
    getActiveAndFutureCampaigns: function (id_list) {
        var now = new Date();
        return Campaign
            .findAll({
                where: {
                    id: {
                        not: id_list
                    },
                    launch_date: {
                        lte: now
                    },
                    end_date: {
                        gt: now
                    }
                },
                order: 'end_date ASC'
            });
    },
    getPastCampaigns: function (id_list) {
        var now = new Date();
        return Campaign
            .findAll({
                where: {
                    id: {
                        not: id_list
                    },
                    launch_date: {
                        lte: now
                    },
                    end_date: {
                        lt: now
                    }
                },
                limit: 5,
                order: 'end_date DESC'
            });
    },
    getRedeemedCampaignsByIDList: function (id_list) {
        return Campaign
            .findAll({
                where: {
                    id: id_list
                },
                limit: 5
            });
    },
    getRedeemedCampaignsByCustomerID: function (customer_id, monthLimit) {

        var sql = "SELECT c.*, u.date, u.store_id, s.name as store_name, u.date as redeem_date " +
            "FROM maggs_campaigns c, maggs_used_coupons u " +
            "LEFT JOIN maggs_stores s ON s.id = u.store_id " +
            "WHERE u.campaign_id = c.id " +
            "AND u.customer_id = " + customer_id + " ";

        if (monthLimit) {
            sql += "AND u.date > CURRENT_DATE - INTERVAL '" + monthLimit + "' MONTH ";
        }
        sql += "ORDER BY u.date DESC " +
            "LIMIT 5;"
        return models.sequelize
            .query(sql);
    },
    getAllCampaignsByCustomerID: function (customer_id) {
        return UsedCoupons.
            findAll({
                where: {
                    customer_id: customer_id
                },
                order: 'date DESC'
            });
    },
    getUnusedGeoCampaignsByCustomerID: function (customer_id) {
        return models.sequelize
            .query("SELECT g.* " +
            "FROM maggs_geo_campaigns g, maggs_pushed_geo_coupons p " +
            "WHERE p.geo_campaign_id = g.id " +
            "AND p.customer_id = " + customer_id + " " +
            "AND p.redeemed = false " +
            "AND g.start_date <= CURRENT_TIMESTAMP " +
            "AND g.end_date > CURRENT_TIMESTAMP " +
            "ORDER BY g.end_date ASC;"
        );
    },
    getUsedGeoCampaignsByCustomerID: function (customer_id, monthLimit) {
        var sql = "SELECT g.*, p.date " +
            "FROM maggs_geo_campaigns g, maggs_pushed_geo_coupons p " +
            "WHERE p.geo_campaign_id = g.id " +
            "AND p.customer_id = " + customer_id + " " +
            "AND p.redeemed = true ";
        if (monthLimit) {
            sql += "AND p.date > CURRENT_DATE - INTERVAL '" + monthLimit + "' MONTH ";
        }
        sql += "ORDER BY g.end_date DESC " +
            "LIMIT 5;";
        return models.sequelize
            .query(sql);
    },
    getLastCampaignsByCustomerID: function (customer_id) {
        var twoMonthAgo = new Date();
        twoMonthAgo.setMonth(twoMonthAgo.getMonth() - 2);

        return UsedCoupons.
            findAll({
                where: {
                    customer_id: customer_id,
                    date: {
                        gte: twoMonthAgo
                    }
                },
                order: 'date DESC'
            });
    },
    getScheduledThankyouMessage: function (now) {

        return models.sequelize
            .query("" +
            "SELECT thank.*, store_id " +
            "FROM maggs_thankyou_messages thank " +
            "LEFT JOIN maggs_ipad_interactions inter ON thank.ipad_interaction_id = inter.id " +
            "WHERE thank.scheduled_date > '" + now.toISOString() + "';");


        /* return ThankyouMessage
         .find({
         where: {
         createdAt: {
         gt: now
         }
         }
         });
         */
    },
    getCouponsByCustomerID: function (res, customer_id) {
        var that = this;
        var results = [];

        that.getAllCampaignsByCustomerID(customer_id)
            .success(function (all_used_coupons) {
                var used_ids = [-1];
                for (var i = 0; i < all_used_coupons.length; i++) {
                    used_ids.push(all_used_coupons[i].campaign_id);
                }
                that.getActiveAndFutureCampaigns(used_ids)
                    .success(function (activeCampaigns) {
                        var now = new Date();

                        async.map(activeCampaigns, function (camp, cb) {
                            camp.getStores().then(function (stores) {
                                camp.dataValues.store_ids = _.pluck(stores, 'id');
                                cb();
                            }).catch(function (err) {
                                cb(err);
                            });


                        }, function (err) {
                            for (var i = 0; i < activeCampaigns.length; i++) {
                                var campaignStartDate = new Date(activeCampaigns[i].start_date);
                                // check if the campaign is active or not yet active
                                if (now < campaignStartDate) {
                                    activeCampaigns[i].dataValues['status'] = 1;
                                } else {
                                    activeCampaigns[i].dataValues['status'] = 2;
                                }
                                activeCampaigns[i].dataValues['id'] = 'coupon-standard-' + activeCampaigns[i].dataValues['id'];
                                activeCampaigns[i].dataValues['redeemed_date'] = null;
                                results.push(activeCampaigns[i]);
                            }
                            that.getUnusedGeoCampaignsByCustomerID(customer_id)
                                .success(function (pushed_geo_coupons) {

                                    for (var i = 0; i < pushed_geo_coupons.length; i++) {
                                        pushed_geo_coupons[i]['status'] = 2;
                                        pushed_geo_coupons[i]['id'] = 'coupon-geo-' + pushed_geo_coupons[i]['id'];
                                        results.push(pushed_geo_coupons[i]);
                                    }
                                    that.getRedeemedCampaignsByCustomerID(customer_id, 1)
                                        .success(function (redeemed_campaigns) {

                                            for (var i = 0; i < redeemed_campaigns.length; i++) {
                                                redeemed_campaigns[i]['status'] = 3;
                                                redeemed_campaigns[i]['redeemed_date'] = redeemed_campaigns[i].date;
                                                redeemed_campaigns[i]['id'] = 'coupon-standard-' + redeemed_campaigns[i]['id'];
                                                results.push(redeemed_campaigns[i]);
                                            }
                                            that.getUsedGeoCampaignsByCustomerID(customer_id, 1)
                                                .success(function (used_geo_coupons) {
                                                    for (var i = 0; i < used_geo_coupons.length; i++) {
                                                        used_geo_coupons[i]['status'] = 3;
                                                        used_geo_coupons[i]['id'] = 'coupon-geo-' + used_geo_coupons[i]['id'];
                                                        used_geo_coupons[i]['redeemed_date'] = used_geo_coupons[i].date;
                                                        results.push(used_geo_coupons[i]);
                                                    }
                                                    results.sort(that.orderCouponList);
                                                    return res.json(results);
                                                    /*
                                                     that.getPastCampaigns(used_ids)
                                                     .success(function (past_campaigns) {
                                                     for (var i = 0; i < past_campaigns.length; i++) {
                                                     past_campaigns[i].dataValues['status'] = 4;
                                                     past_campaigns[i].dataValues['redeemed_date'] = null;
                                                     results.push(past_campaigns[i]);
                                                     }
                                                     return res.json(results);
                                                     })
                                                     .error(function (err) {
                                                     res.statusCode = 500;
                                                     res.write('APIErrorServerError');
                                                     res.end();
                                                     });
                                                     */
                                                })
                                                .error(function (err) {
                                                    res.statusCode = 500;
                                                    res.write('APIErrorServerError');
                                                    res.end();
                                                });

                                        })
                                        .error(function (err) {
                                            res.statusCode = 500;
                                            res.write('APIErrorServerError');
                                            res.end();
                                        });
                                })
                                .error(function (err) {
                                    res.statusCode = 500;
                                    res.write('APIErrorServerError');
                                    res.end();
                                });

                        });


                    })
                    .error(function (err) {
                        res.statusCode = 500;
                        res.write('APIErrorServerError');
                        res.end();
                    });
            })
            .error(function (err) {
                res.statusCode = 500;
                res.write('APIErrorServerError');
                res.end();
            });
    }
};