var express = require('express');
var router = express.Router();
var https = require('https');
var models = require('../../models/index.js');
var Campaign = models['maggs_campaign'];
var Customer = models['maggs_customer'];
var randomString = require('../../helpers/random')['randomString'];
var contestHelper = require('../../helpers/contests');
var findMethods = require('../../models/findMethods');
var parse = require('../../helpers/parse');
var analytics = require('../../helpers/analytics');
var _ = require('lodash');
var soap = require('../../helpers/soap');
var Card = models['maggs_card'];
var AppInfo = models['maggs_app_info'];
var mailer = require('../../helpers/mailer');
var moment = require('moment');

router.post('/customer/new', function (req, res) {
    var card_id = req.body.card_id;

    // If card_id was sent in request
    if (card_id) {
        Customer.find({where: {card_id: card_id}})
            .then(function (customer) {
                // If customer exists in our database
                if (customer) {
                    soap.SPSConnect(req, {args: {card_id: card_id}, method: 'GetDeviceInfo'}, function (err, response) {
                        if (err) return res.json(customer);

                        // If exist in SPS update gold points
                        if (response.GetDeviceInfoResult.Code == '0') {
                            customer.gold_points = parseFloat(response.deviceInfo.DeviceList.Device.Balance);

                            // also check name on sps
                            soap.SPSConnect(req, {
                                args: {card_id: card_id},
                                method: 'GetMemberInfo'
                            }, function (err, response) {

                                var spsName = response.memberInfo.Firstname;
                                var spsLastName = response.memberInfo.Surname;

                                if (spsName && spsName.length && spsName != customer.firstname) {
                                    customer.firstname = spsName;
                                }

                                if (spsLastName && spsLastName.length && spsLastName != customer.lastname) {
                                    customer.lastname = spsLastName;
                                }


                                customer.save().then(function (customer) {
                                    res.json(customer);

                                }).catch(function (err) {
                                    res.statusCode = 500;
                                    res.json(err);
                                });
                            });


                        } else {
                            res.json(customer);
                        }
                    });

                    // Customer doesn't exist in our database
                } else {
                    soap.SPSConnect(req, {args: {card_id: card_id}, method: 'GetDeviceInfo'}, function (err, response) {
                        if (err) return res.status(500).json("Can't connect to SPS!!!");
                        // If exist in SPS create new Customer
                        if (response.GetDeviceInfoResult.Code == '0') {

                            var newCustomer = {
                                card_id: card_id,
                                gold_points: parseInt(response.deviceInfo.DeviceList.Device.Balance)
                            };

                            // check if name is existing too
                            soap.SPSConnect(req, {
                                args: {card_id: card_id},
                                method: 'GetMemberInfo'
                            }, function (err, response) {

                                var spsName = response.memberInfo.Firstname;
                                var spsLastName = response.memberInfo.Surname;

                                if (spsName && spsName.length) {
                                    newCustomer.firstname = spsName;
                                }

                                if (spsLastName && spsLastName.length) {
                                    newCustomer.lastname = spsLastName;
                                }

                                Customer.create(newCustomer)
                                    .then(function (customer) {
                                        res.json(customer);
                                    })
                                    .catch(function (err) {
                                        res.statusCode = 500;
                                        res.json(err);
                                    });
                            });

                        } else {
                            res.statusCode = 404;
                            res.json('Customer doesn\'t exist');
                        }
                    });
                }
            })
            .catch(function (err) {
                res.statusCode = 500;
                res.json(err);
            });

        // If card_id was NOT sent in request
    } else {
        Card.find({
            where: {available: true}
        })
            .then(function (card) {
                if (!card) return res.status(404).json("No avalaible cards!");

                Customer.create({
                    card_id: card.card_id,
                    gold_points: 1,
                })
                    .then(function (customer) {
                        card.available = false;
                        card.save()
                            .then(function (card) {

                                Card.findAll({where: {available: true}})
                                    .then(function(cards){
                                        if(cards.length < 501) {
                                            var protocol = req.connection.encrypted ? 'https' : 'http';
                                            var baseUrl = protocol + '://' + req.headers.host + '/';

                                            //baseUrl = "http://maggs-test.smartfactory.ch/";

                                            // Send email to daniel.boehlen@loeb.ch
                                            mailer.sendEmail({
                                                template: 'cardsNumber',
                                                to: 'andreas.jossen@swisscom.com, app@smartfactory.ch',
                                                subject: 'MAGGS - Karten gehen aus. '
                                            }, {

                                                baseUrl: baseUrl
                                            }, function (err, msg) {
                                                if (err) return res.status(500).json('customer created, but email was not sent!');

                                                return res.json(customer);
                                            });
                                        } else {
                                            return res.json(customer);
                                        }
                                    })

                            }).catch(function (err) {
                                res.statusCode = 500;
                                res.json('Card not saved');
                            });
                    })
                    .catch(function (err) {
                        res.statusCode = 500;
                        res.json(err);
                    });
            })
            .catch(function (err) {
                return res.status(500).send(err.name);
            });
    }
});


router.post('/customer/register', function (req, res) {
    var card_id = req.body.card_id;
    if (!card_id) return res.status(500).json('card_id parameter required')

    Customer.find({
        where: {card_id: card_id}
    })
        .then(function (customer) {
            if (!customer) res.status(404).json('APIErrorNoSuchCustomer');

            customer.firstname = req.body.firstname;
            customer.lastname = req.body.lastname;
            customer.birthday = (req.body.dateofbirth) ? new moment(req.body.dateofbirth, 'YYYY-MM-DD').format('YYYY-MM-DD') : null;
            customer.title = req.body.title;
            customer.street = req.body.street;
            customer.city = req.body.city;

            customer.save()
                .then(function (customer) {

                    var protocol = req.connection.encrypted ? 'https' : 'http';
                    var baseUrl = protocol + '://' + req.headers.host + '/';

                    //baseUrl = "http://maggs-test.smartfactory.ch/";

                    // Send email to daniel.boehlen@loeb.ch
                    mailer.sendEmail({
                        template: 'customerRegistration',
                        to: 'daniel.boehlen@loeb.ch',
                        subject: 'MAGGS - Neuer Kunde hat sich angemeldet'
                    }, {
                        customer: customer,
                        birthday: moment(customer.birthday).format('DD.MM.YYYY'),
                        baseUrl: baseUrl
                    }, function (err, msg) {
                        if (err) return res.status(500).json('customer registered, but email was not sent!');

                        return res.json(customer);
                    });
                })
                .catch(function (err) {
                    res.statusCode = 500;
                    res.json(err);
                });
        })
        .catch(function (err) {
            res.statusCode = 500;
            res.json(err);
        });
});


router.route('/customer/:id')
    .get(function (req, res) {
        var customer_id = req.params.id;

        Customer
            .find({
                where: {
                    id: customer_id
                }
            })
            .then(
            function (customer) {
                if (!customer) {
                    res.statusCode = 404;
                    res.json('APIErrorNoSuchCustomer');
                } else {

                    // SOAP request / edit customer gold points
                    soap.SPSConnect(req, {
                        args: {card_id: customer.card_id},
                        method: 'GetDeviceInfo'
                    }, function (err, response) {

                        // If exist in SPS update gold points
                        if (response.GetDeviceInfoResult.Code == '0') {
                            customer.gold_points = parseFloat(response.deviceInfo.DeviceList.Device.Balance);

                            // also check name on sps
                            soap.SPSConnect(req, {
                                args: {card_id: customer.card_id},
                                method: 'GetMemberInfo'
                            }, function (err, response) {

                                var spsName = response.memberInfo.Firstname;
                                var spsLastName = response.memberInfo.Surname;

                                if (spsName && spsName.length && spsName != customer.firstname) {
                                    customer.firstname = spsName;
                                }

                                if (spsLastName && spsLastName.length && spsLastName != customer.lastname) {
                                    customer.lastname = spsLastName;
                                }


                                customer.save().then(function (customer) {
                                    res.json(customer);

                                }).catch(function (err) {
                                    res.statusCode = 500;
                                    res.json(err);
                                });
                            });
                        } else {
                            res.json(customer);
                        }
                    });
                }
            }
        )
            .catch(function (err) {
                res.statusCode = 500;
                res.json(err);
            });
    });

router.route('/card/:card_id')
    .get(function (req, res) {
        var card_id = req.params.card_id;

        Customer
            .find({
                where: {card_id: card_id}
            })
            .then(function (customer) {

                // If user doesn't exist in our database try to register it locally with data from SPS
                if (!customer) {
                    //analytics.useExistingCardToAnalytics(customer.id, card_id);

                    // SOAP request Device Info
                    soap.SPSConnect(req, {
                        args: {card_id: req.params.card_id},
                        method: 'GetDeviceInfo'
                    }, function (err, responseDevice) {
                        if (responseDevice.GetDeviceInfoResult.Code != '0') return res.json('APIErrorNoSuchCustomer');

                        // SOAP request Member Info
                        soap.SPSConnect(req, {
                            args: {card_id: req.params.card_id},
                            method: 'GetMemberInfo'
                        }, function (err, responseMember) {
                            if (responseMember.GetMemberInfoResult.Code != '0' || err) return res.json('APIErrorNoSuchCustomer');

                            Customer.create({
                                gold_points: parseFloat(responseDevice.deviceInfo.DeviceList.Device.Balance),
                                firstname: responseMember.memberInfo.Firstname,
                                lastname: responseMember.memberInfo.Surname,
                                birthday: moment(responseMember.memberInfo.Dob).format('YYYY-MM-DD'),
                                city: responseMember.memberInfo.City,
                                street: responseMember.memberInfo.Street,
                                gender: (responseMember.memberInfo.Gender == 'weiblich') ? 'female' : 'male',
                                card_id: card_id
                            })
                                .then(function (customer) {
                                    res.json(customer);
                                })
                                .catch(function (err) {
                                    res.statusCode = 500;
                                    res.json(err);
                                });
                        });
                    });

                    // try to update customer gold points and return object
                } else {
                    analytics.useExistingCardToAnalytics(customer.id, card_id);

                    // SOAP request / edit customer gold points
                    soap.SPSConnect(req, {
                        args: {card_id: req.params.card_id},
                        method: 'GetDeviceInfo'
                    }, function (err, responseDevice) {
                        // Return old customer data
                        if (responseDevice.GetDeviceInfoResult.Code != '0' || err) return res.json(customer);

                        // SOAP request Member Info
                        soap.SPSConnect(req, {
                            args: {card_id: req.params.card_id},
                            method: 'GetMemberInfo'
                        }, function (err, responseMember) {
                            if (responseMember.GetMemberInfoResult.Code != '0' || err) return res.json(customer);

                            // If customer is not registered in our database try to register him form SPS
                            if (customer.firstname == null && customer.lastname == null) {
                                customer.firstname = responseMember.memberInfo.Firstname;
                                customer.lastname = responseMember.memberInfo.Surname;
                                customer.birthday = moment(responseMember.memberInfo.Dob).format('YYYY-MM-DD');
                                customer.city = responseMember.memberInfo.City;
                                customer.street = responseMember.memberInfo.Street;
                                customer.gender = (responseMember.memberInfo.Gender == 'weiblich') ? 'female' : 'male';
                            }

                            customer.gold_points = parseFloat(responseDevice.deviceInfo.DeviceList.Device.Balance);

                            customer.save()
                                .then(function (customer) {
                                    res.json(customer);

                                }).catch(function (err) {
                                    res.statusCode = 500;
                                    res.json(err);
                                });
                        });
                    });
                }
            })
            .catch(function (err) {
                res.statusCode = 500;
                res.json(err);
            });
    });

// TODO: Experimental, remove (unless needed)
router.route('/customers')
    .get(function (req, res) {
        var customer_id = req.params.id;

        Customer
            .findAll()
            .then(
            function (customers) {
                if (!customers) {
                    res.statusCode = 404;
                    res.json('APIErrorNoSuchCustomer');
                } else {
                    res.json(customers);
                }
            }
        )
            .catch(function (err) {
                res.statusCode = 500;
                res.json(err);
            });
    });


/*
 *
 *
 * CONTESTS
 *
 *
 */
router.get('/customer/profile/:card_id', function (req, res) {
    Customer.find({where: {'card_id': req.params.card_id}})
        .then(function (customer) {
            if (!customer) return res.json('No customer with that card');
            if (!customer.nickname) return res.status(404).json('User must register for contests first.');

            models.sequelize.query(
                "SELECT *, " +
                "(SELECT COUNT (DISTINCT likes) FROM maggs_contest_entries WHERE contest_id=entries.contest_id AND likes>entries.likes)+1 AS ranking " +
                "FROM maggs_contest_entries AS entries " +
                "WHERE customer_id=" + parseInt(customer.id) + " " +
                "AND report_count < 3 " +
                "ORDER BY ranking;").then(function (contestData) {
                    customer.getLevel(function (level) {

                        if (!level) return res.status(500).json({err: 'Can\'t get level'});

                        var contestInfo = [];

                        contestHelper.getRankings(customer.id, function (rank) {
                            if (!rank) return res.status(500).json("Can't get rankings");

                            //console.log(rank);

                            _.each(contestData, function (data) {
                                contestInfo.push({
                                    id: data.id,
                                    contest_id: data.contest_id,
                                    image: data.photo,
                                    description: data.description,
                                    likes: data.likes,
                                    voted: _.indexOf(data.votes, customer.id) > -1,
                                    rank: data.ranking
                                });
                            });

                            var customerData = {
                                nickname: customer.nickname,
                                gender: customer.gender,
                                levelData: level,
                                contestData: contestInfo,
                                globalRanking: rank.rank
                            };

                            res.json(customerData);
                        });
                    });

                }).catch(function (err) {
                    res.statusCode = 500;
                    res.json(err);
                });


        }).catch(function (err) {
            res.statusCode = 500;
            res.json(err);
        });
});


router.post('/customer/profile/new', function (req, res) {
    Customer.find({where: {'card_id': req.body.card_id}})
        .then(function (customer) {
            if (customer.nickname) return res.status(400).json('Profile already exist');
            if (!req.body.card_id || !req.body.nickname || !req.body.gender) return res.status(400).json('Please enter all data');

            Customer.find({
                where: {nickname: req.body.nickname}
            })
                .then(function (customerNickname) {
                    if (customerNickname) {
                        if (customerNickname) return res.status(400).json('Nickname already exist');
                    } else {

                        customer.nickname = req.body.nickname;
                        customer.gender = req.body.gender;

                        customer.save()
                            .then(function (customer) {

                                res.json(customer);
                            })

                            .catch(function (err) {
                                res.statusCode = 500;
                                res.json(err);
                            });
                    }
                })
                .catch(function (err) {
                    return res.status(500).json(err);
                })

        }).catch(function (err) {
            res.statusCode = 500;
            res.json(err);
        });
});


// todo for testing purposes delete me after
router.post('/customer/profile/delete', function (req, res) {
    Customer.find({where: {'card_id': req.body.card_id}})
        .then(function (customer) {
            customer.nickname = null;
            customer.gender = null;

            customer.save().then(function (customer) {

                res.json(customer);

            }).catch(function (err) {
                res.statusCode = 500;
                res.json(err);
            });

        }).catch(function (err) {
            res.statusCode = 500;
            res.json(err);
        });
});


router.get('/letterDate/:card_id', function (req, res) {
    var now = new moment().format('YYYY-MM-DD HH:mm:ss+02');
    //
    //var sql = "SELECT letter.date as future_date, " +
    //        "(SELECT letter.date as past_date FROM maggs_app_infoes AS letterPast WHERE letterPast.date < '"+ now +"' LIMIT 1) " +
    //        "AS past_date " +
    //    "FROM maggs_app_infoes AS letter " +
    //    "WHERE letter.date > '"+ now +"' LIMIT 1;";
    //
    //models.sequelize.query(sql)

    AppInfo.find({
        where: {
            date: {
                gte: now
            }
        },
        limit: 1
    })
        .then(function (letter) {
            futureDate = letter ? new moment(letter.date).format('YYYY-MM-DD') : null;

            AppInfo.find({
                where: {
                    date: {
                        lte: now
                    }
                },
                limit: 1
            })
                .then(function (letterPast) {
                    pastDate = letterPast ? new moment(letterPast.date).format('YYYY-MM-DD') : null;
                    if (pastDate) {
                        console.log('----------------------------OK');
                    } else {
                        console.log('----------------------------NULL');
                    }

                    Customer.find({
                        where: {'card_id': req.params.card_id}
                    })
                        .then(function (customer) {
                            if (!customer) return res.status(404).json('Customer not found');

                            // SOAP request / edit customer gold points
                            soap.SPSConnect(req, {
                                args: {card_id: customer.card_id},
                                method: 'GetDeviceInfo'
                            }, function (err, response) {

                                // If exist in SPS update gold points
                                if (response.GetDeviceInfoResult.Code == '0') {
                                    customer.gold_points = parseFloat(response.deviceInfo.DeviceList.Device.Balance);
                                    customer.save()
                                        .then(function (customer) {
                                            var data = {
                                                id: customer.id,
                                                card_id: customer.card_id,
                                                gold_points: customer.goldpoints,
                                                gender: customer.gender,
                                                nickname: customer.nickname,
                                                firstname: customer.firstname,
                                                lastname: customer.lastname,
                                                futureDate: (futureDate) ? new moment(futureDate).format('DD.MM.YYYY') : '-',
                                                pastDate: (pastDate) ? new moment(pastDate).format('DD.MM.YYYY') : '-'
                                            };

                                            res.json(data);

                                        }).catch(function (err) {
                                            res.statusCode = 500;
                                            res.json(err);
                                        });
                                } else {
                                    var data = {
                                        id: customer.id,
                                        card_id: customer.card_id,
                                        gold_points: customer.goldpoints,
                                        gender: customer.gender,
                                        nickname: customer.nickname,
                                        firstname: customer.firstname,
                                        lastname: customer.lastname,
                                        futureDate: (futureDate) ? new moment(futureDate).format('DD.MM.YYYY') : '-',
                                        pastDate: (pastDate) ? new moment(pastDate).format('DD.MM.YYYY') : '-'
                                    };

                                    res.json(data);
                                }
                            });

                        }).catch(function (err) {
                            res.statusCode = 500;
                            res.json(err);
                        });
                })
                .catch(function (err) {
                    return res.status(500).json(err);
                });
        })
        .catch(function (err) {
            res.statusCode = 500;
            res.json(err);
        });
});


router.get('/sps/:card_id', function (req, res) {
    var soap = require('../../helpers/soap');

    soap.SPSConnect(req, {args: {card_id: req.params.card_id}, method: 'GetMemberInfo'}, function (err, response) {
        if (err) return res.status(500).json(err);

        return res.json(response);

    });

});


router.get('/sps2/:card_id', function (req, res) {
    var soap = require('../../helpers/soap');

    soap.SPSConnect(req, {args: {card_id: req.params.card_id}, method: 'GetDeviceInfo'}, function (err, response) {
        if (err) return res.status(500).json(err);

        return res.json(response);

    });

});


module.exports = router;