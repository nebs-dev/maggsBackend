var models = require('../models/index.js');
var _ = require('lodash');
var async = require('async');
var Customer = models['maggs_customer'];


module.exports = {
    getRankings: function (customerId, cb) {

        if (typeof(customerId) === 'function') {
            cb = customerId;
            customerId = false;
        }

        models.sequelize.query(
            "SELECT customer_id, SUM (likes) AS likes " +
            "FROM maggs_contest_entries " +
            "GROUP BY (customer_id) ORDER BY (likes) DESC").then(function (ranks) {

                if(!ranks.length) return cb(true);
                //console.log('--------------------------',ranks);

                var rankNo = 0, rankLikes, customerLikes;
                async.each(ranks, function (rank, callback) {
                    Customer.find(rank.customer_id).then(function (customer) {
                        customer.getLevel(function (level) {
                            if (!level) return callback({err: 'no level'});

                            if (rank.likes !== rankLikes) {
                                rankLikes = rank.likes;
                                rankNo++;
                            }

                            rank.rank = rankNo;
                            rank.levelData = level;

                            // we dont need this info... we have it in level data
                            /* todo refractor getlevel method and this into if possible one method?...
                             double counting of likes :\
                             getlevel not using sql count...
                             */
                            delete rank.likes;

                            if (rank.customer_id === customerId) {
                                customerLikes = rank;
                                return callback();
                            }

                            callback();

                        });
                    }).catch(function (err) {
                        callback(err);
                    })
                }, function (err) {
                    if (err) return cb(false);

                    if (customerId) {
                        if (customerLikes) {
                            return cb(customerLikes);
                        } else {
                            var lastRank = ranks[ranks.length - 1];

                            if (lastRank.levelData.totalLikes !== 0) {
                                lastRank.rank++;
                            }

                            Customer.find(customerId).then(function (customer) {
                                customer.getLevel(function (level) {
                                    if (!level) return cb(false);
                                    lastRank.levelData = level;
                                    return cb(lastRank);
                                });
                            }).catch(function (err) {
                                return cb(false);
                            });
                        }
                    } else {
                        return cb(ranks);
                    }

                });
            }).catch(function (err) {
                cb(false);
            });
    }
};
