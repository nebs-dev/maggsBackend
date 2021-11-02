var express = require('express');
var router = express.Router();
var https = require('https');
var models = require('../../models/index.js');
var path = require('path');
var Contests = models['maggs_contest'];
var ContestLevels = models['maggs_contest_level'];
var contestHelper = require('../../helpers/contests');
var ContestsEntry = models['maggs_contest_entry'];
var Customer = models['maggs_customer'];
var _ = require('lodash');
var shortId = require('shortid');
var fs = require('fs');
var async = require('async');
var DiskUsage = require('../../helpers/diskUsage');
var mailer = require('../../helpers/mailer');
var moment = require('moment');
var parse = require('../../helpers/parse');

router.route('/contests')
    .get(function (req, res) {
        //var now = new moment().format('YYYY-MM-DD HH:mm:ss+02');
        var now = new Date();
        var pastMonthDate = new Date();
        pastMonthDate.setDate(pastMonthDate.getDate() - 30);

        Contests
            .findAll({
                attributes: ['id', 'hashtag', 'description', 'icon', 'start_date', 'end_date'],
                include: [{model: ContestsEntry, as: 'ContestEntries'}],
                order: 'end_date ASC',
                where: {
                    end_date: {
                        gte: now
                    }
                }
            })
            .success(function (contests) {
                // we only need to show contest information, no need for all entries on this route
                // + we will add info about total number of entries per contest
                _.map(contests, function (obj) {
                    var validEntries =  _.filter(obj.dataValues.contestEntries, function(obj) {
                        return (obj.report_count < 3) ? obj : false;
                    });
                    obj.dataValues.image_count = validEntries.length;
                    obj.dataValues.active = (obj.dataValues.end_date >= now) ? true : false;
                    delete obj.dataValues.contestEntries;
                });

                Contests
                    .findAll({
                        attributes: ['id', 'hashtag', 'description', 'icon', 'start_date', 'end_date'],
                        include: [{model: ContestsEntry, as: 'ContestEntries'}],
                        order: 'end_date DESC',
                        where: {
                            start_date: {
                                lte: now
                            },
                            end_date: {
                                gte: pastMonthDate,
                                lte: now
                            }
                        }
                    })
                    .success(function (pastContests) {
                        _.map(pastContests, function (obj) {
                            var validEntries =  _.filter(obj.dataValues.contestEntries, function(obj) {
                                return (obj.report_count < 3) ? obj : false;
                            });
                            obj.dataValues.image_count = validEntries.length;
                            obj.dataValues.active = (obj.dataValues.end_date >= now) ? true : false;
                            delete obj.dataValues.contestEntries;
                            contests.push(obj);
                        });

                        return res.json(contests);
                    });

            })
            .error(function (err) {
                return res.status(500).json('APIErrorServerError');
            });
    });

router.route('/contest/:id')
    .get(function (req, res) {

        var sql = "SELECT *, " +
            "(SELECT COUNT (DISTINCT likes) FROM maggs_contest_entries WHERE contest_id=entries.contest_id AND likes>entries.likes)+1 AS ranking " +
            "FROM maggs_contest_entries AS entries " +
            "WHERE report_count < 3 AND  contest_id=" + parseInt(req.params.id) + " " +
            "ORDER BY ranking ";

        if(typeof req.query.limit != 'undefined' && typeof req.query.offset != 'undefined') {
            sql += "LIMIT "+parseInt(req.query.limit)+" OFFSET "+parseInt(req.query.offset)+";";
        } else {
            sql += ";";
        }

        // we need to select all entries from selected contest id and add ranking information to entries
        models.sequelize.query(sql)

            .then(function (contestData) {

                // for each entry we must get level info of customer that uploaded entry
                async.each(contestData, function (entry, callback) {
                    Customer.find(entry.customer_id).then(function (customer) {
                        customer.getLevel(function (level) {
                            if (!level) callback('Can\'t get level');

                            // asign level info for customer that uploaded this entry
                            entry.customer_level = level;

                            // we dont need votes or reports info for app...
                            delete entry.votes;
                            delete entry.reports;

                            callback();

                        });
                    }).catch(function (err) {
                        callback(err);
                    });
                }, function (err) {
                    if (err) return res.status(500).json(err);

                    return res.json(contestData);

                });

            }).catch(function (err) {
                return res.status(500).json(err);
            });
    });


//entry
router.route('/contest/:id/new')
    .post(function (req, res) {

        if (!req.body.card_id) return res.status(404).json('card_id is required');

        Customer.find({where: {'card_id': req.body.card_id}})
            .then(function (customer) {

                if (!customer || !customer.nickname) return res.status(404).json('No nickname');
                if (!req.body.picture) return res.status(400).json('No picture in request');

                // every picture that is uploaded have this construction:
                // CONTEST-ID-UNIQUE STRING.png
                var unique = shortId.generate();
                var imgPath = '/img/uploads/contest-' + req.params.id + '-' + unique + '.png';

                // we are sending base64 pngs from app, so we need to strip unnecessary data
                // sometimes app sends string with data:image... part, and sometimes not...
                var base64string = req.body.picture.replace(/^data:image\/(png|gif|jpeg);base64,/, '').replace(/base64,/, '');

                var buff = new Buffer(base64string, 'base64');

                fs.writeFile('public' + imgPath, buff, function (err) {
                    if (err) throw err;

                    // after file is uploaded, write data to db
                    ContestsEntry
                        .create({
                            description: req.body.description,
                            photo: imgPath,
                            contest_id: req.params.id,
                            customer_id: customer.id
                        })
                        .then(function (entry) {

                            // check disk usage
                            // todo uncomment below, test on hlozancic only for now
                            //DiskUsage.checkUsage('maggsapp@smartfactory.ch, roger@smartfactory.ch, andreas.jossen@swisscom.com');
                            DiskUsage.checkUsage('app@smartfactory.ch');

                            return res.json(entry);


                        })
                        .catch(function (err) {
                            return res.status(500).json(err);
                        });
                });
            });
    });


router.route('/contest-entry/vote/:id')
    .post(function (req, res) {
        Customer.find({where: {'card_id': req.body.card_id}})
            .then(function (customer) {

                // if customer has no nickname, that means he is not allowed to vote... he must register first
                if (!customer || !customer.nickname) return res.status(404).json({
                    status: false,
                    comment: req.i18n.__("User has no contest profile or user by this card id doesn't exist.")
                });

                ContestsEntry.find(req.params.id)
                    .then(function (entry) {
                        // firstly handle some rules...
                        if (!entry) return res.status(404).json({
                            status: false,
                            comment: req.i18n.__('Wrong contest entry')
                        });
                        if (_.indexOf(entry.votes, customer.id) > -1) return res.status(400).json({
                            status: false,
                            comment: req.i18n.__('Already voted')
                        });
                        if (entry.customer_id === customer.id) return res.status(400).json({
                            status: false,
                            comment: req.i18n.__("Can't vote for myself")
                        });

                        var sql = "SELECT *, " +
                            "(SELECT COUNT (DISTINCT likes) FROM maggs_contest_entries WHERE contest_id=entries.contest_id AND likes>entries.likes)+1 AS ranking " +
                            "FROM maggs_contest_entries AS entries " +
                            "WHERE report_count < 3 AND  contest_id=" + parseInt(entry.contest_id) + " AND id= " + parseInt(entry.id) + " " +
                            "ORDER BY ranking LIMIT 1";

                        // contest entry ranking
                        models.sequelize.query(sql).then(function (entryRanking) {
                            // find entry customer
                            Customer.find(entry.customer_id).then(function (entryCustomer) {
                                if (!entryCustomer) return res.status(500).json("Can't get entry customer");

                                // get entry customer level
                                entryCustomer.getLevel(function (entryCustomerLevel) {
                                    customer.getLevel(function (level) {
                                        if (!level) return res.status(500).json({
                                            status: false,
                                            comment: "Server error: Can't get level"
                                        });

                                        // create empty array if not existing, so we don't break when pushing
                                        if (!entry.votes || !entry.votes.length) {
                                            entry.votes = [];
                                        }

                                        // push customer id to votes, so we know that he just voted
                                        entry.votes.push(customer.id);

                                        // handle dislike/like type
                                        if (req.body.type === 'dislike') {
                                            if (entry.likes > 0) {
                                                entry.likes = entry.likes - level.points;
                                            }
                                        } else {
                                            entry.likes = entry.likes + level.points;
                                        }

                                        // save LIKE
                                        entry.save().then(function (entrySaved) {
                                            models.sequelize.query(sql).then(function (newEntryRanking) {
                                                entryCustomer.getLevel(function (newLevel) {

                                                    // Customer level up
                                                    if (entryCustomerLevel.title != newLevel.title) {
                                                        console.log('------------------->', 'LEVEL UP !');
                                                        parse.pushLevelUp(entryCustomer, req.i18n.__("Glückwunsch Sie sind ein Level aufgestiegen bei der MAGGS Style Cam."));
                                                    }

                                                    // If entry jumped to the first place
                                                    if(entryRanking[0].ranking != '1' && newEntryRanking[0].ranking == '1') {
                                                        entrySaved.getContest().then(function(contest){
                                                            console.log('------------------->', 'Contest entry jumped to the 1. place !');
                                                            parse.pushEntryFirstPlace(entryCustomer, req.i18n.__("Gratulation: Ihr Bild ist auf dem ersten Platz des ") + contest.hashtag +' '+ req.i18n.__("Contest"));
                                                        })
                                                    }

                                                    return res.json({
                                                        status: true,
                                                        comment: "Voted!"
                                                    });
                                                });
                                            });
                                        }).catch(function (err) {
                                            return res.status(500).json(err);
                                        });

                                    });
                                });
                            });

                        });

                    }).catch(function (err) {
                        return res.status(500).json(err);
                    });


            }).catch(function (err) {
                return res.status(500).json(err);
            });

    });

router.route('/contest-entry/report/:id')
    .post(function (req, res) {
        Customer.find({where: {'card_id': req.body.card_id}})
            .then(function (customer) {

                // if customer has no nickname, that means he is not allowed to vote... he must register first
                if (!customer || !customer.nickname) return res.status(404).json({
                    status: false,
                    comment: "User has no contest profile or user by this card id doesn't exist."
                });

                ContestsEntry.find(req.params.id)
                    .then(function (entry) {

                        // firstly handle some rules...
                        if (!entry) return res.status(404).json({
                            status: false,
                            comment: req.i18n.__('Wrong contest entry')
                        });
                        if (_.indexOf(entry.reports, customer.id) > -1) return res.status(400).json({
                            status: false,
                            comment: req.i18n.__('Already reported')
                        });
                        if (entry.customer_id === customer.id) return res.status(400).json({
                            status: false,
                            comment: req.i18n.__("Can't report myself")
                        });


                        // create empty array if not existing, so we don't break when pushing
                        if (!entry.reports || !entry.reports.length) {
                            entry.reports = [];
                        }

                        // push customer id to votes, so we know that he just voted
                        entry.reports.push(customer.id);
                        // adn add +1 to report count
                        entry.report_count = entry.report_count || 0;
                        entry.report_count++;


                        // todo check this a bit... callbacks and stuff
                        // send email if 3 reports detected
                        if (entry.report_count >= 3) {
                            mailer.sendEmail({
                                template: 'offensiveImage',
                                to: 'daniel.boehlen@loeb.ch',
                                //to: 'hlozancic@gmail.com', // todo change this email
                                subject: 'ANSTÖSSIGES BILD FESTGESTELLT'
                            }, {
                                url: 'http://maggs-prod.smartfactory.ch/cms/entry/' + entry.id // todo change link
                            }, function (err, msg) {
                                if (err) console.warn('MAIL NOT SENT');

                                res.json('appointment removed!');
                            });
                        }


                        entry.save().then(function (entrySaved) {
                            return res.json({
                                status: true,
                                comment: "Reported!"
                            });
                        }).catch(function (err) {
                            return res.status(500).json(err);
                        });


                    }).catch(function (err) {
                        return res.status(500).json(err);
                    });


            }).catch(function (err) {
                return res.status(500).json(err);
            });

    });


router.route('/contests/levels')
    .get(function (req, res) {
        ContestLevels.findAll({order: 'required'}).then(function (levels) {
            res.json(levels);
        }).catch(function (err) {
            res.statusCode = 500;
            res.json(err);
        });
    });

router.route('/contests/leaderboard')
    .get(function (req, res) {
        contestHelper.getRankings(function (ranks) {
            if (!ranks) return res.status(500).json("Can't get rankings");

            if (req.query.card_id) {

                var myRank = _.find(ranks, function (myRank) {
                    return myRank.levelData.card_id === req.query.card_id;
                });

                myRank.current_customer = true;
            }


            return res.json(_.filter(ranks, function (rank) {
                return rank.rank <= 100 || rank.current_customer;
            }));

        });
    });

module.exports = router;