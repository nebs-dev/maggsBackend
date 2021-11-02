/* global require */
var express = require('express');
var router = express.Router();
var formValidators = require('../helpers/formValidators');
var isLoggedIn = require('./isLoggedIn');
var isSuperadmin = require('./isSuperadmin');
var models = require('../models/index');
var Campaign = models['maggs_campaign'];
var GeoCampaign = models['maggs_geo_campaign'];
var PushedGeoCoupon = models['maggs_pushed_geo_coupon'];
var Beacon = require('../models/index')['maggs_beacon'];
var Store = require('../models/index')['maggs_store'];
var User = require('../models/index')['maggs_user'];
var Appointment = require('../models/index')['maggs_appointment'];
var Contest = require('../models/index')['maggs_contest'];
var ThankyouMessage = require('../models/index')['maggs_thankyou_message'];
var UsedCoupon = require('../models/index')['maggs_used_coupon'];
var ContestsEntry = require('../models/index')['maggs_contest_entry'];
var Levels = require('../models/index')['maggs_contest_level'];
var AppInfo = require('../models/index')['maggs_app_info'];
var STORES = {};
var BEACONS = {};
var dates = require('../helpers/dates');
var path = require('path');
var fs = require('fs-extra');
var schedule = require('node-schedule');
var parse = require('../helpers/parse');
var html_strip = require('htmlstrip-native');
var moment = require('moment');
var _ = require('lodash');
var async = require('async');
var base64Upload = require('../helpers/base64Upload');
var shortId = require('shortid');


router.get('/', isLoggedIn, function (req, res) {
    return res.redirect('/cms/overview');
});

// LETTER DATES
router.get('/letter', [isLoggedIn, isSuperadmin], function (req, res) {
    AppInfo.findAll({
        where: {type: 'letter_date'},
        order: 'date DESC'
    })
        .then(function (letterDates) {

            res.locals.dateToString = dates.dateToString;
            return res.render('cms/letter_dates', {letterDates: letterDates});

        })
        .catch(function (err) {
            return res.status(500).send(err);
        });
});

router.get('/letter/create', [isLoggedIn, isSuperadmin], function (req, res) {
    return res.render('cms/letter_dates_create');
});


router.post('/letter/create', [isLoggedIn, isSuperadmin], function (req, res) {
    AppInfo.create({
        type: 'letter_date',
        value: null,
        date: moment(req.body.letterDate, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DD HH:mm:ss')

    }).then(function (letterDate) {
        return res.redirect('/cms/letter');
    }).catch(function (err) {
        return res.status(500).send(err);
    });
});

router.get('/letter/delete/:id', [isLoggedIn, isSuperadmin], function (req, res) {
    AppInfo.find({
        where: {
            id: req.params.id
        }
    }).then(function (letter) {
        if (!letter) return res.json('No letters with id ' + req.params.id);

        letter.destroy()
            .then(function () {
                return res.redirect('/cms/letter');
            })
            .catch(function (err) {
                return res.send(err);
            });

    }).catch(function (err) {
        return res.send(err);
    });
});


// USER
router.get('/users', [isLoggedIn, isSuperadmin], function (req, res) {
    User.findAll({})
        .then(function (users) {
            return res.render('cms/user_index', {users: users, reqUser: req.session.user});
        })
        .catch(function (err) {
            return res.send(err);
        });
});

router.get('/user/create', [isLoggedIn, isSuperadmin], function (req, res) {
    Store.findAll({})
        .then(function (stores) {
            return res.render('cms/user_create', {stores: stores});
        })
        .catch(function (err) {
            return res.send(err);
        });
});

router.post('/user/create', [isLoggedIn, isSuperadmin], function (req, res) {
    User.create({
        email: req.body.email.toLowerCase(),
        password: User.generateHash(req.body.password),
        email_confirmed: req.body.email_confirmed,
        superadmin: req.body.superadmin

    }).then(function (user) {
        // Add store to user
        Store.find({where: {'id': req.body.store}})
            .then(function (store) {
                user.addStore(store)
                    .then(function () {
                        return res.redirect('/cms/users');
                    })
                    .catch(function (err) {
                        return res.send(err.name);
                    });
            }).catch(function (err) {
                return res.send(err);
            });

    }).catch(function (err) {
        return res.send(err);
    });
});

router.get('/user/edit/:id', [isLoggedIn, isSuperadmin], function (req, res) {
    var user_id = req.params.id;

    User.find(user_id).then(function (user) {
        if (!user) return res.json('No user with id ' + user_id);

        // todo get stores not working here... ask nebs why he used through param in association model of users...
        // same stuff works for beacons :\ here getStores return []
        user.getStores().then(function (store) {
            Store.findAll({})
                .then(function (stores) {
                    var sql = "SELECT store_id FROM user_store WHERE user_id = " + user.id + " LIMIT 1;";

                    models.sequelize.query(sql)
                        .then(function (store_id) {

                            return res.render('cms/user_edit', {
                                user: user,
                                stores: stores,
                                store_id: (store_id.length) ? store_id[0].store_id : store_id
                            });
                        })
                        .catch(function (err) {
                            return res.status(500).json(err);
                        });
                })
                .catch(function (err) {
                    return res.status(500).json(err);
                });
        }).catch(function (err) {
            return res.status(500).json(err);
        });

    }).catch(function (err) {
        return res.send(err);
    });
});

router.post('/user/edit/:id', isLoggedIn, function (req, res) {
    var user_id = req.params.id;

    User.find({
        where: {
            id: user_id
        }
    }).then(function (user) {
        if (!user) return res.json('No user with id ' + user_id);

        user.email = req.body.email;
        if (req.body.password) {
            user.password = User.generateHash(req.body.password);
        }
        user.email_confirmed = (req.body.email_confirmed) ? req.body.email_confirmed : false;

        if (req.session.user.id == user.id) {
            user.superadmin = req.body.superadmin;
        } else {
            user.superadmin = (req.body.superadmin) ? req.body.superadmin : false;
        }

        // Save user, delete his connections to store and add new one
        user.save()
            .then(function (user) {
                var sql = "DELETE FROM user_store WHERE user_id = " + user.id + ";";

                models.sequelize.query(sql)
                    .then(function () {
                        Store.find({where: {'id': req.body.store}})
                            .then(function (store) {
                                user.addStore(store)
                                    .then(function () {
                                        return res.redirect('/cms/users');
                                    })
                                    .catch(function (err) {
                                        return res.send(err.name);
                                    });
                            }).catch(function (err) {
                                return res.send(err);
                            });
                    })
                    .catch(function (err) {
                        return res.status(500).json(err);
                    });

            }).catch(function (err) {
                return res.status(500).send(err);
            });

    }).catch(function (err) {
        return res.status(500).send(err);
    });
});

router.get('/user/delete/:id', [isLoggedIn, isSuperadmin], function (req, res) {
    var user_id = req.params.id;

    User.find({
        where: {
            id: user_id
        }
    }).then(function (user) {
        if (!user) return res.json('No users with id ' + user_id);

        user.destroy()
            .then(function () {
                return res.redirect('/cms/users');
            })
            .catch(function (err) {
                return res.send(err);
            });

    }).catch(function (err) {
        return res.send(err);
    });
});


// STORE
router.get('/stores', isLoggedIn, function (req, res) {
    if (req.session.user.superadmin) {
        Store.findAll({})
            .then(function (stores) {
                return res.render('cms/store_index', {stores: stores, superadmin: req.session.user.superadmin});
            })
            .catch(function (err) {
                return res.send(err);
            });
    } else {
        req.session.user.getStores()
            .then(function (stores) {
                return res.render('cms/store_index', {stores: stores, superadmin: req.session.user.superadmin});
            })
            .catch(function (err) {
                return res.send(err);
            });
    }
});

router.get('/store/create', isLoggedIn, function (req, res) {
    return res.render('cms/store_create');
});

router.post('/store/create', isLoggedIn, function (req, res) {
    Store.create({
        name: req.body.name,
        streetNr: req.body.streetNr,
        town: req.body.town,
        phone: req.body.phone,
        postcode: req.body.postcode,
        contactEmail: req.body.contactEmail,
        storemanagerEmail: req.body.storemanagerEmail,
        lat: req.body.lat,
        long: req.body.long,
        photo: req.body.photo,
        key: req.body.key,
        secret: req.body.secret
    })
        .then(function (store) {
            return res.redirect('/cms/stores');
        })
        .catch(function (err) {
            return res.send(err);
        });
});

router.get('/store/edit/:id', isLoggedIn, function (req, res) {
    var store_id = req.params.id;

    Store.find({
        where: {
            id: store_id
        }
    }).then(function (store) {
        if (!store) return res.json('No stores with id ' + store_id);

        if (req.session.user.superadmin) return res.render('cms/store_edit', {store: store});

        store.hasUser(req.session.user)
            .then(function (result) {
                if (result) {
                    return res.render('cms/store_edit', {store: store});
                } else {
                    return res.redirect('/cms/overview');
                }
            })
            .catch(function (err) {
                return res.send(err);
            });
    }).catch(function (err) {
        return res.send(err.name);
    });
});

router.post('/store/edit/:id', isLoggedIn, function (req, res) {
    var store_id = req.params.id;

    Store.find({
        where: {
            id: store_id
        }
    }).then(function (store) {
        if (!store) return res.json('No stores with id ' + store_id);

        store.name = req.body.name;
        store.streetNr = req.body.streetNr;
        store.town = req.body.town;
        store.phone = req.body.phone;
        store.postcode = req.body.postcode;
        store.contactEmail = req.body.contactEmail;
        store.storemanagerEmail = req.body.storemanagerEmail;
        store.lat = req.body.lat;
        store.long = req.body.long;
        store.photo = req.body.photo;
        store.key = req.body.key;
        store.secret = req.body.secret;

        if (req.session.user.superadmin) {
            store.save()
                .then(function (store) {
                    return res.redirect('/cms/stores');
                }).catch(function (err) {
                    return res.send(err);
                });
        }

        store.hasUser(req.session.user)
            .then(function (result) {
                if (result) {
                    store.save()
                        .then(function (store) {
                            return res.redirect('/cms/stores');
                        }).catch(function (err) {
                            return res.send(err);
                        });
                } else {
                    return res.redirect('/cms/stores');
                }
            })
            .catch(function (err) {
                return res.send(err);
            });

    }).catch(function (err) {
        return res.send(err.name);
    });
});

router.get('/store/delete/:id', [isLoggedIn, isSuperadmin], function (req, res) {
    var store_id = req.params.id;

    Store.find({
        where: {
            id: store_id
        }
    }).then(function (store) {
        if (!store) return res.json('No stores with id ' + store_id);

        // Delete appointments
        models.sequelize.query('DELETE FROM maggs_appointments WHERE store_id = ' + store.id)
            .then(function () {

                // Delete maggs pushed geo coupons
                var sql = "SELECT mpgc.* FROM maggs_beacons b INNER JOIN maggs_pushed_geo_coupons mpgc ON mpgc.beacon_id = b.id where b.store_id=" + store.id;
                models.sequelize.query(sql)
                    .then(function (pushed_coupons) {
                        async.each(pushed_coupons, function (push_coupon, callback) {
                            PushedGeoCoupon.find(push_coupon.id)
                                .then(function (pushGeoCoupon) {
                                    pushGeoCoupon.destroy()
                                        .then(function () {
                                            callback();
                                        })
                                        .catch(function (err) {
                                            callback(err)
                                        });
                                }).catch(function (err) {
                                    callback(err)
                                });

                        }, function (err) {
                            if (err) {
                                return res.send(err);
                            } else {
                                // Delete beacons
                                models.sequelize.query('DELETE FROM maggs_beacons WHERE store_id = ' + store.id)
                                    .then(function () {
                                        // Delete thank you messages
                                        var sql = "SELECT m.* FROM maggs_thankyou_messages m INNER JOIN maggs_ipad_interactions i ON i.id = m.ipad_interaction_id WHERE i.store_id = " + store.id;
                                        models.sequelize.query(sql)
                                            .then(function (messages) {
                                                async.each(messages, function (message, callback) {
                                                    ThankyouMessage.find(message.id)
                                                        .then(function (thankYouMessage) {
                                                            thankYouMessage.destroy()
                                                                .then(function () {
                                                                    callback();
                                                                })
                                                                .catch(function (err) {
                                                                    callback(err)
                                                                });
                                                        }).catch(function (err) {
                                                            callback(err)
                                                        });

                                                }, function (err) {
                                                    if (err) {
                                                        return res.send(err);
                                                    } else {
                                                        // Delete from ipad interactions
                                                        models.sequelize.query('DELETE FROM maggs_ipad_interactions WHERE store_id = ' + store.id)
                                                            .then(function () {
                                                                // Delete coupons
                                                                models.sequelize.query('DELETE FROM campaign_store WHERE store_id = ' + store.id)
                                                                    .then(function () {
                                                                        // Delete feedbacks
                                                                        models.sequelize.query('DELETE FROM maggs_customer_feedbacks WHERE store_id = ' + store.id)
                                                                            .then(function () {
                                                                                // Delete used coupons
                                                                                models.sequelize.query('DELETE FROM maggs_used_coupons WHERE store_id = ' + store.id)
                                                                                    .then(function () {
                                                                                        var sql = 'SELECT * FROM maggs_campaigns AS c LEFT JOIN campaign_store AS cs ON cs.campaign_id = c.id WHERE cs.campaign_id IS NULL';
                                                                                        models.sequelize.query(sql)
                                                                                            .then(function (campaigns) {
                                                                                                async.each(campaigns, function (campaign, callback) {
                                                                                                    Campaign.find(campaign.id)
                                                                                                        .then(function (campaign) {
                                                                                                            campaign.destroy()
                                                                                                                .then(function () {
                                                                                                                    callback();
                                                                                                                })
                                                                                                                .catch(function (err) {
                                                                                                                    callback(err)
                                                                                                                });
                                                                                                        }).catch(function (err) {
                                                                                                            callback(err)
                                                                                                        });

                                                                                                }, function (err) {
                                                                                                    if (err) {
                                                                                                        return res.send(err);
                                                                                                    } else {
                                                                                                        store.destroy()
                                                                                                            .then(function () {
                                                                                                                req.session.success = req.i18n.__('Store successfully deleted.');
                                                                                                                return res.redirect('/cms/stores');
                                                                                                            })
                                                                                                            .catch(function (err) {
                                                                                                                return res.send(err);
                                                                                                            });
                                                                                                    }
                                                                                                });
                                                                                            });
                                                                                    });
                                                                            })
                                                                    });
                                                            });
                                                    }
                                                });
                                            })
                                    });
                            }
                        });
                    });
            });

    }).catch(function (err) {
        return res.send(err.name);
    });
});


// BEACONS
router.get('/beacons', [isLoggedIn, isSuperadmin], function (req, res) {
    res.locals.dateToString = dates.dateToString;

    if (req.session.user.superadmin) {
        models.sequelize
            .query(
            "SELECT b.*, s.name AS store_name " +
            "FROM maggs_beacons b " +
            "INNER JOIN maggs_stores s ON b.store_id = s.id;"
        )
            .then(function (beacons) {
                return res.render('cms/beacon_index', {beacons: beacons});
            })
            .catch(function (err) {
                return res.send(err.name);
            });
    } else {
        models.sequelize
            .query(
            "SELECT b.*, s.name AS store_name " +
            "FROM maggs_beacons b " +
            "INNER JOIN maggs_stores s ON b.store_id = s.id " +
            "INNER JOIN user_store us ON us.store_id = s.id " +
            "INNER JOIN maggs_users u ON us.user_id = u.id " +
            "WHERE u.id = " + req.session.user.id + ";"
        ).then(function (beacons) {
                return res.render('cms/beacon_index', {beacons: beacons});
            }).catch(function (err) {
                return res.send(err);
            });
    }
});

router.get('/beacon/create', [isLoggedIn, isSuperadmin], function (req, res) {
    var sql = "SELECT s.* " +
        "FROM maggs_stores s ";
    if (!req.session.user.superadmin) {
        sql += "INNER JOIN user_store us ON us.store_id = s.id " +
            "WHERE us.user_id = " + req.session.user.id + ";";
    }

    models.sequelize
        .query(sql)
        //Store.findAll({})
        .then(function (stores) {
            return res.render('cms/beacon_create', {stores: stores});
        })
        .catch(function (err) {
            return res.send(err);
        });
});

router.post('/beacon/create', [isLoggedIn, isSuperadmin], function (req, res) {
    Beacon.create({
        name: req.body.name,
        uuid: req.body.uuid,
        major: req.body.major,
        minor: req.body.minor,
        cash_register: req.body.cash_register,
        store_id: req.body.store

    }).then(function (beacon) {
        return res.redirect('/cms/beacons');
    }).catch(function (err) {
        return res.send(err);
    });
});

router.get('/beacon/edit/:id', [isLoggedIn, isSuperadmin], function (req, res) {
    var beacon_id = req.params.id;

    Beacon.find({
        where: {
            id: beacon_id
        }
    }).then(function (beacon) {
        if (!beacon) return res.json('No beacons with id ' + beacon_id);
        beacon.getStore()
            .then(function (store) {

                var sql = "SELECT s.* " +
                    "FROM maggs_stores s ";
                if (!req.session.user.superadmin) {
                    sql += "INNER JOIN user_store us ON us.store_id = s.id " +
                        "WHERE us.user_id = " + req.session.user.id + ";";
                }

                models.sequelize
                    .query(sql)
                    //Store.findAll({})
                    .then(function (stores) {
                        return res.render('cms/beacon_edit', {beacon: beacon, stores: stores});
                    })
                    .catch(function (err) {
                        return res.send(err);
                    });
            })
            .catch(function (err) {
                return res.send(err);
            });
    }).catch(function (err) {
        return res.send(err.name);
    });
});

router.post('/beacon/edit/:id', [isLoggedIn, isSuperadmin], function (req, res) {
    var beacon_id = req.params.id;

    Beacon.find({
        where: {
            id: beacon_id
        }
    }).then(function (beacon) {
        if (!beacon) return res.json('No beacons with id ' + store_id);

        beacon.name = req.body.name;
        beacon.uuid = req.body.uuid;
        beacon.major = req.body.major;
        beacon.minor = req.body.minor;
        beacon.cash_register = (req.body.cash_register) ? req.body.cash_register : false;
        beacon.store_id = req.body.store;

        beacon.save().then(function (beacon) {
            return res.redirect('/cms/beacons');
        }).catch(function (err) {
            return res.send(err);
        });

    }).catch(function (err) {
        return res.send(err.name);
    });
});

router.get('/beacon/delete/:id', [isLoggedIn, isSuperadmin], function (req, res) {
    var beacon_id = req.params.id;

    Beacon.find({
        where: {
            id: beacon_id
        }
    }).then(function (beacon) {
        if (!beacon) return res.json('No beacons with id ' + beacon_id);

        beacon.destroy()
            .then(function () {
                return res.redirect('/cms/beacons');
            })
            .catch(function (err) {
                return res.send(err);
            });

    }).catch(function (err) {
        return res.send(err.name);
    });
});


// APPOINTMENTS
router.get('/appointments', isLoggedIn, function (req, res) {
    if (req.session.user.superadmin) {
        var query = "SELECT * FROM maggs_stores;";
    } else {
        var query = "SELECT * FROM maggs_stores AS s " +
            "INNER JOIN user_store us ON us.store_id = s.id " +
            "WHERE us.user_id = " + req.session.user.id + " ";
    }

    models.sequelize
        .query(query)
        .then(function (stores) {
            return res.render('cms/appointment_index', {stores: stores});
        })
        .catch(function (err) {
            return res.send(err);
        });
});

router.get('/appointments/:id', isLoggedIn, function (req, res) {
    var store_id = req.params.id;

    Store.find({
        where: {
            id: store_id
        }
    })
        .then(function (store) {
            store.getAppointments()
                .then(function (appointments) {
                    var appArray = _.map(_.pluck(appointments, 'date'), function (date) {
                        return moment(date).format('YYYY-MM-DD');
                    });
                    return res.render('cms/appointment_single', {store: store, appointments: appArray});
                })
                .catch(function (err) {
                    return res.send(err.name);
                });
        })
        .catch(function (err) {
            return res.send(err.name);
        });
});

router.post('/appointment/add', isLoggedIn, function (req, res) {
    Appointment.find({
        where: {
            date: req.body.date,
            store_id: req.body.store_id
        }
    })
        .then(function (appointment) {

            var times = JSON.parse(req.body.times);

            if (appointment) {
                if (times.length) {
                    appointment.time = times;
                    appointment.save().then(function (appointment) {
                        res.json(appointment)
                    }).catch(function (err) {
                        return res.send(err);
                    });
                } else {
                    appointment.destroy().then(function () {
                        res.json('destroyed');
                    }).catch(function (err) {
                        return res.send(err);
                    });
                }
            } else {
                Appointment.create({
                    date: req.body.date,
                    time: times,
                    store_id: req.body.store_id

                }).then(function (appointment) {
                    res.json(appointment)
                })
                    .catch(function (err) {
                        return res.json(err);
                    });
            }
        })
        .catch(function (err) {
            return res.json(err);
        });
});

router.post('/appointment/remove', isLoggedIn, function (req, res) {
    if (!appointment_id) return res.json('appointment_id is mandatory');

    Appointment.find({
        where: {id: req.session.appointment_id}
    })
        .then(function (appointment) {
            user.destroy()
                .then(function () {
                    return res.json(true);
                })
                .catch(function (err) {
                    return res.json(err);
                });
        })
        .catch(function (err) {
            return res.json(err);
        });
});

router.post('/appointment/hours', isLoggedIn, function (req, res) {
    var query = "SELECT a.time FROM maggs_stores s " +
        "INNER JOIN maggs_appointments a ON a.store_id = s.id " +
        "WHERE a.date = '" + req.body.date + "' " +
        "AND s.id = " + req.body.store_id + " LIMIT 1;";

    models.sequelize
        .query(query)
        .then(function (appointment) {
            return res.json(appointment[0].time);
        })
        .catch(function (err) {
            return res.send(err);
        });
});

// LEVELS
router.get('/levels', [isLoggedIn, isSuperadmin], function (req, res) {
    Levels.findAll({
        order: 'required ASC'
    })
        .then(function (levels) {
            return res.render('cms/level_index', {levels: levels});
        })
        .catch(function (err) {
            return res.send(err);
        });
});


router.get('/level/create', [isLoggedIn, isSuperadmin], function (req, res) {
    return res.render('cms/level_create');
});


router.post('/level/create', [isLoggedIn, isSuperadmin], function (req, res) {
    //var female_path = '/img/uploads/' + req.files.female.name;
    //var female_location = path.join(__dirname, '../' + req.files.female.path);
    //var male_path = '/img/uploads/' + req.files.male.name;
    //var male_location = path.join(__dirname, '../' + req.files.male.path);

    var imgPathFemale = false;
    var imgPathMale = false;

    // todo refractor pls one day
    if (req.body.female) {
        var fileToUpload = base64Upload.getBase64Blob(req.body.female);
        if (fileToUpload) {
            var unique = shortId.generate();
            imgPathFemale = '/img/uploads/levelAvatar-' + req.params.id + '-' + unique + fileToUpload.ext;

            fs.writeFile(__dirname + '/../public/' + imgPathFemale, fileToUpload.base64, 'base64', function (err) {
                if (err) {
                    imgPathFemale = false;
                }
            });
        }
    }

    if (req.body.male) {
        var fileToUpload = base64Upload.getBase64Blob(req.body.male);
        if (fileToUpload) {
            var unique = shortId.generate();
            imgPathMale = '/img/uploads/levelAvatar-' + req.params.id + '-' + unique + fileToUpload.ext;

            fs.writeFile(__dirname + '/../public/' + imgPathMale, fileToUpload.base64, 'base64', function (err) {
                if (err) {
                    imgPathMale = false;
                }
            });
        }
    }

    Levels.create({
        title: req.body.title,
        required: req.body.required,
        points: req.body.points,
        female: imgPathFemale ? imgPathFemale : false,
        male: imgPathMale ? imgPathMale : false
    })
        .then(function (level) {
            req.session.success = req.i18n.__('Level successfully created.');
            return res.redirect('/cms/levels');
        })
        .catch(function (err) {
            return res.send(err);
        });
});


router.get('/level/edit/:id', [isLoggedIn, isSuperadmin], function (req, res) {
    Levels.find(req.params.id)
        .then(function (level) {
            if (!level) res.send('No level with ID ' + req.params.id);

            return res.render('cms/level_edit', {level: level});
        })
        .catch(function (err) {
            res.send(err);
        });
});

router.post('/level/edit/:id', [isLoggedIn, isSuperadmin], function (req, res) {
    var level_id = req.params.id;

    Levels.find(level_id).then(function (level) {
        if (!level) return res.json('No level with id ' + level_id);

        var oldFemaleAvatar = __dirname + '/../public' + level.female;
        var oldMaleAvatar = __dirname + '/../public' + level.male;

        var imgPathFemale = false;
        var imgPathMale = false;

        // todo refractor pls one day
        if (req.body.female) {
            var fileToUpload = base64Upload.getBase64Blob(req.body.female);
            if (fileToUpload) {
                var unique = shortId.generate();
                imgPathFemale = '/img/uploads/levelAvatar-' + req.params.id + '-' + unique + fileToUpload.ext;

                fs.writeFile(__dirname + '/../public/' + imgPathFemale, fileToUpload.base64, 'base64', function (err) {
                    if (err) {
                        imgPathFemale = false;
                    } else {
                        path.exists(oldFemaleAvatar, function (exists) {
                            if (exists) {
                                fs.remove(oldFemaleAvatar);
                            }
                        });
                    }
                });
            }
        }

        if (req.body.male) {
            var fileToUpload = base64Upload.getBase64Blob(req.body.male);
            if (fileToUpload) {
                var unique = shortId.generate();
                imgPathMale = '/img/uploads/levelAvatar-' + req.params.id + '-' + unique + fileToUpload.ext;

                fs.writeFile(__dirname + '/../public/' + imgPathMale, fileToUpload.base64, 'base64', function (err) {
                    if (err) {
                        imgPathMale = false;
                    } else {
                        path.exists(oldMaleAvatar, function (exists) {
                            if (exists) {
                                fs.remove(oldMaleAvatar);
                            }
                        });
                    }
                });
            }
        }

        level.title = req.body.title;
        level.required = req.body.required;
        level.points = req.body.points;
        if (imgPathFemale) {
            level.female = imgPathFemale;
        }
        if (imgPathMale) {
            level.male = imgPathMale;
        }

        level.save()
            .then(function (level) {
                return res.redirect('/cms/levels');
            }).catch(function (err) {
                return res.send(err);
            });

    }).catch(function (err) {
        return res.send(err.name);
    });
});


router.get('/level/delete/:id', [isLoggedIn, isSuperadmin], function (req, res) {
    Levels.find(req.params.id).then(function (level) {
        if (!level) return res.json('No level with id ' + req.params.id);

        var female_icon = __dirname + '/../public' + level.female;
        var male_icon = __dirname + '/../public' + level.male;

        level.destroy()
            .then(function () {

                // Destroy image
                path.exists(female_icon, function (exists) {
                    if (exists) {
                        fs.remove(female_icon);
                    }
                });

                path.exists(male_icon, function (exists) {
                    if (exists) {
                        fs.remove(male_icon);
                    }
                });

                return res.redirect('/cms/levels');
            })
            .catch(function (err) {
                return res.send(err);
            });

    }).catch(function (err) {
        return res.send(err.name);
    });
});


// CONTEST
router.get('/contests', isLoggedIn, function (req, res) {
    var now = new moment().format('YYYY-MM-DD HH:mm:ss+02');


    Contest.findAll({
        attributes: ['id', 'hashtag', 'description', 'icon', 'start_date', 'end_date'],
        where: {
            end_date: {
                gte: now
            }
        },
        order: 'end_date ASC'
    })

        .then(function (contests) {
            // archived contests
            Contest.findAll({
                attributes: ['id', 'hashtag', 'description', 'icon', 'start_date', 'end_date'],
                where: {
                    end_date: {
                        lte: now
                    }
                }
            })
                .then(function (archivedContests) {
                    var query = "SELECT * FROM maggs_contest_entries e " +
                        "WHERE e.report_count >= 3;";

                    models.sequelize.query(query)
                        // reported entries
                        .then(function (entries) {
                            res.locals.dateToString = dates.dateToString;
                            return res.render('cms/contest_index', {
                                contests: contests,
                                entries: entries,
                                archivedContests: archivedContests
                            });
                        })
                })
        })
        .catch(function (err) {
            return res.send(err);
        });
});


router.get('/contest/view/:id', isLoggedIn, function (req, res) {
    Contest.find({
        where: {
            id: req.params.id
        }
    })
        .then(function (contest) {
            if (!contest) res.send('No contest with ID ' + req.params.id);

            contest.getContestEntries()
                .then(function (entries) {
                    res.locals.dateToString = dates.dateToString;
                    return res.render('cms/contest_info', {contest: contest, entries: entries});
                })
                .catch(function (err) {
                    res.send(err);
                });
        })
        .catch(function (err) {
            res.send(err);
        });
});

router.get('/entry/:id', isLoggedIn, function (req, res) {
    ContestsEntry.find({
        where: {
            id: req.params.id
        }
    })
        .then(function (entry) {
            if (!entry) res.send('No entry with ID ' + req.params.id);

            entry.getCustomer()
                .then(function (customer) {
                    customer.getLevel(function (level) {
                        customer.level = level;

                        res.locals.dateToString = dates.dateToString;
                        return res.render('cms/entry_info', {entry: entry, customer: customer});
                    });
                })
                .catch(function (err) {
                    res.send(err);
                });
        })
        .catch(function (err) {
            res.send(err);
        });
});


router.get('/entry/reports/reset/:id', isLoggedIn, function (req, res) {
    ContestsEntry.find({
        where: {
            id: req.params.id
        }
    })
        .then(function (entry) {
            if (!entry) res.send('No entry with ID ' + req.params.id);

            entry.report_count = 0;

            entry.save()
                .then(function (entry) {
                    return res.redirect('/cms/entry/' + entry.id);
                })
                .catch(function (err) {
                    res.send(err);
                });
        })
        .catch(function (err) {
            res.send(err);
        });
});


router.get('/entry/delete/:id', isLoggedIn, function (req, res) {
    ContestsEntry.find({
        where: {
            id: req.params.id
        }
    })
        .then(function (entry) {
            if (!entry) res.send('No entry with ID ' + req.params.id);

            var contest_id = entry.contest_id;
            var photo = __dirname + '/../public' + entry.photo;

            entry.destroy()
                .then(function () {

                    // Destroy entry photo
                    path.exists(photo, function (exists) {
                        if (exists) {
                            fs.remove(photo);
                        }
                    });

                    return res.redirect('/cms/contest/view/' + contest_id);
                })
                .catch(function (err) {
                    res.send(err.name);
                });
        })
        .catch(function (err) {
            res.send(err.name);
        });
});


router.get('/contest/create', isLoggedIn, function (req, res) {
    return res.render('cms/contest_create');
});

router.post('/contest/create', isLoggedIn, function (req, res) {
    //var icon_path = '/img/uploads/' + req.files.icon.name;
    //var icon_location = path.join(__dirname, '../' + req.files.icon.path);

    var imgPathIcon = false;
    if (req.body.icon) {
        var fileToUpload = base64Upload.getBase64Blob(req.body.icon);
        if (fileToUpload) {
            var unique = shortId.generate();
            imgPathIcon = '/img/uploads/' + unique + fileToUpload.ext;

            fs.writeFile(__dirname + '/../public/' + imgPathIcon, fileToUpload.base64, 'base64', function (err) {
                if (err) {
                    imgPathIcon = false;
                }
            });
        }
    }

    var hashtag = req.body.hashtag;
    while (hashtag.charAt(0) === '#')
        hashtag = hashtag.substr(1);

    Contest.create({
        hashtag: hashtag,
        description: req.body.description,
        icon: imgPathIcon ? imgPathIcon : false,
        start_date: moment(req.body.startDate, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DD HH:mm:ss'),
        end_date: moment(req.body.endDate, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DD HH:mm:ss')
    })
        .then(function (contest) {

            /** create cron jobs for contest pushes **/
            // contest start pushes
            var cbStart = function () {
                var message = req.i18n.__("Neuer Wettbewerb") + ' ' + contest.hashtag;
                new parse.pushNewContestToAll(message, contest.id);
            };
            new schedule.scheduleJob('contest' + contest.id, new Date(contest.start_date), cbStart);

            // contest end pushes
            var cbEnd = function () {
                var message = req.i18n.__("Der") + ' ' + contest.hashtag + ' ' + req.i18n.__("Wettbewerb ist beendet. Sehen sie hier Ihre Platzierung.");
                new parse.pushEndContest(message, contest.id);
            };
            new schedule.scheduleJob('contest_end' + contest.id, new Date(contest.end_date), cbEnd);

            req.session.success = req.i18n.__('Contest successfully created.');
            return res.redirect('/cms/contests');
        })
        .catch(function (err) {
            return res.send(err);
        });
});

router.get('/contest/edit/:id', isLoggedIn, function (req, res) {
    Contest.find({
        where: {
            id: req.params.id
        }
    })
        .then(function (contest) {
            if (!contest) res.send('No contest with ID ' + req.params.id);

            res.locals.dateToString = dates.dateToString;
            return res.render('cms/contest_edit', {contest: contest});
        })
        .catch(function (err) {
            res.send(err);
        });
});

router.post('/contest/edit/:id', isLoggedIn, function (req, res) {
    var contest_id = req.params.id;

    Contest.find({
        where: {
            id: contest_id
        }
    }).then(function (contest) {
        if (!contest) return res.json('No contest with id ' + contest_id);

        var oldIcon = __dirname + '/../public' + contest.icon;

        var imgPathIcon = false;
        if (req.body.icon) {
            var fileToUpload = base64Upload.getBase64Blob(req.body.icon);
            if (fileToUpload) {
                var unique = shortId.generate();
                imgPathIcon = '/img/uploads/' + unique + fileToUpload.ext;

                fs.writeFile(__dirname + '/../public/' + imgPathIcon, fileToUpload.base64, 'base64', function (err) {
                    if (err) {
                        imgPathIcon = false;
                    }
                });
            }
        }

        var hashtag = req.body.hashtag;
        while (hashtag.charAt(0) === '#') {
            hashtag = hashtag.substr(1);
        }

        contest.hashtag = hashtag;
        contest.icon = imgPathIcon ? imgPathIcon : contest.icon;
        contest.description = req.body.description;
        contest.start_date = moment(req.body.startDate, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DD HH:mm:ss');
        contest.end_date = moment(req.body.endDate, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DD HH:mm:ss');

        contest.save()
            .then(function (contest) {

                /** create cron jobs for contest pushes **/
                // contest start pushes
                var cbStart = function () {
                    var message = req.i18n.__("Neuer Wettbewerb") + ' ' + contest.hashtag;
                    new parse.pushNewContestToAll(message, contest.id);
                };
                schedule.cancelJob("contest"+contest.id);
                new schedule.scheduleJob('contest' + contest.id, new Date(contest.start_date), cbStart);

                // contest end pushes
                var cbEnd = function () {
                    var message = req.i18n.__("Der") + ' ' + contest.hashtag + ' ' + req.i18n.__("Wettbewerb ist beendet. Sehen sie hier Ihre Platzierung.");
                    new parse.pushEndContest(message, contest.id);
                };
                schedule.cancelJob("contest_end"+contest.id);
                new schedule.scheduleJob('contest_end' + contest.id, new Date(contest.end_date), cbEnd);

                // Destroy image
                if (req.body.icon) {
                    path.exists(oldIcon, function (exists) {
                        if (exists) {
                            fs.remove(oldIcon);
                        }
                    });
                }

                return res.redirect('/cms/contests');

            }).catch(function (err) {
                return res.send(err.name);
            });

    }).catch(function (err) {
        return res.send(err.name);
    });
});

router.get('/contest/delete/:id', isLoggedIn, function (req, res) {
    Contest.find({
        where: {
            id: req.params.id
        }
    }).then(function (contest) {
        if (!contest) return res.json('No contest with id ' + contest_id);

        var entry_icon = __dirname + '/../public' + contest.icon;

        contest.destroy()
            .then(function () {

                // Destroy image
                path.exists(entry_icon, function (exists) {
                    if (exists) {
                        fs.remove(entry_icon);
                    }
                });

                schedule.cancelJob("contest"+contest.id);
                schedule.cancelJob("contest_end"+contest.id);

                return res.redirect('/cms/contests');
            })
            .catch(function (err) {
                return res.send(err);
            });

    }).catch(function (err) {
        return res.send(err.name);
    });
});


router.get('/create', isLoggedIn, function (req, res) {

    if (req.session.user.superadmin) {
        var query = Store.findAll({});
    } else {
        var query = req.session.user.getStores();
    }

    query.success(function (stores) {
        var sql = "SELECT b.* " +
            "FROM maggs_beacons b " +
            "INNER JOIN maggs_stores s ON b.store_id = s.id ";
        if (!req.session.user.superadmin) {
            sql += "INNER JOIN user_store us ON us.store_id = s.id " +
                "WHERE us.user_id = " + req.session.user.id + " ";
        }

        sql += "AND b.cash_register = false ";

        models.sequelize
            .query(sql)
            .success(function (beacons) {

                for (var store_index in stores) {
                    var store = stores[store_index];
                    store.dataValues['beacons'] = [];
                    STORES[store.id] = store;
                }

                if (beacons.length) {
                    for (var beacon_index in beacons) {
                        var beacon = beacons[beacon_index];

                        //if(STORES[beacon.store_id]) {
                        STORES[beacon.store_id].dataValues['beacons'].push(beacon);
                        //}
                    }
                }
                if (req.session.form_errors) {
                    var errors = req.session.form_errors;
                    var inputs = req.session.form_inputs;
                    req.session.form_errors = null;
                    req.session.form_inputs = null;
                    return res.render('cms/coupon_creation', {stores: STORES, errors: errors, inputs: inputs});
                }
                return res.render('cms/coupon_creation', {stores: STORES});
            });
    });
});

router.post('/create', isLoggedIn, function (req, res) {
    var errors = formValidators.validateCreateCampaign(req);

    if (errors) {
        req.session.form_inputs = req.body;
        req.session.form_errors = errors;
        if (req.files.icon) {
            var icon_location = path.join(__dirname, '../' + req.files.icon.path);
            fs.remove(icon_location);
        }
        return res.redirect('/cms/create');
    } else {
        //var startDate = new Date(dates.stringToDate(req.body.startDate));
        //var endDate = new Date(dates.stringToDate(req.body.endDate));
        var startDate = moment(req.body.startDate, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DD HH:mm:ss');
        var endDate = moment(req.body.endDate, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DD HH:mm:ss');
        //var icon_path = '/getImage/' + req.files.icon.name;
        //var icon_path = '/img/uploads/' + req.files.icon.name;
        //var icon_location = path.join(__dirname, '../' + req.files.icon.path);

        var imgPathIcon = false;
        if (req.body.icon) {
            var fileToUpload = base64Upload.getBase64Blob(req.body.icon);
            if (fileToUpload) {
                var unique = shortId.generate();
                imgPathIcon = '/img/uploads/' + unique + fileToUpload.ext;

                fs.writeFile(__dirname + '/../public/' + imgPathIcon, fileToUpload.base64, 'base64', function (err) {
                    if (err) {
                        imgPathIcon = false;
                    }
                });
            }
        }

        var imgPathIconWide = false;
        if (req.body.icon_wide) {
            var fileToUpload = base64Upload.getBase64Blob(req.body.icon_wide);
            if (fileToUpload) {
                var unique = shortId.generate();
                imgPathIconWide = '/img/uploads/' + unique + fileToUpload.ext;

                fs.writeFile(__dirname + '/../public/' + imgPathIconWide, fileToUpload.base64, 'base64', function (err) {
                    if (err) {
                        imgPathIconWide = false;
                    }
                });
            }
        }

        if (req.body.campaignType == 'location') {
            if (!(req.body.campaignLocation instanceof Array)) {
                req.body.campaignLocation = [req.body.campaignLocation];
            }
            var beacon_ids = [];
            for (var index in req.body.campaignLocation) {
                beacon_ids.push(parseInt(req.body.campaignLocation[index]));
            }
            GeoCampaign
                .create({
                    description: req.body.description,
                    tagline: req.body.tagline,
                    start_date: startDate,
                    end_date: endDate,
                    value: req.body.value,
                    icon: (imgPathIcon) ? imgPathIcon : null,
                    icon_wide: (imgPathIconWide) ? imgPathIconWide : null,
                    beacon_ids: beacon_ids
                })
                .success(function (geoCampaign) {
                    req.session.success = req.i18n.__('Campaign successfully created.');
                    return res.redirect('/cms/overview');
                })
                .error(function (err) {
                    req.session.form_errors = {unknown: req.i18n.__('There was an error.')};
                    req.session.form_inputs = req.body;
                    return res.redirect('/cms/create');
                });

        } else {
            var launchDate = moment(req.body.launchDate, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DD HH:mm:ss');
            Campaign
                .create({
                    description: req.body.description,
                    tagline: req.body.tagline,
                    start_date: startDate,
                    end_date: endDate,
                    launch_date: launchDate,
                    value: req.body.value,
                    //store_ids: form_stores,
                    icon: (imgPathIcon) ? imgPathIcon : null,
                    icon_wide: (imgPathIconWide) ? imgPathIconWide : null
                })
                .success(function (campaign) {
                    async.each(req.body.store, function (val, callback) {
                        // Add store to campaign
                        Store.find({where: {'id': val}})
                            .then(function (store) {
                                campaign.addStore(store)
                                    .then(function () {
                                        callback();

                                    })
                                    .catch(function (err) {
                                        callback(err);
                                    });
                            }).catch(function (err) {
                                callback(err);
                            });

                    }, function (err) {
                        if (err) {
                            return res.send(err);
                        } else {
                            var cb = function () {
                                new parse.pushNewCouponToAll(req.i18n.__("New coupon: ") + req.body.tagline, 'coupon-standard-' + campaign.id);
                            };

                            new schedule.scheduleJob('campaign' + campaign.id, new Date(launchDate), cb);
                            req.session.success = req.i18n.__('Campaign successfully created.');
                            return res.redirect('/cms/overview');
                        }
                    });
                })
                .error(function (err) {
                    req.session.form_errors = {unknown: req.i18n.__('There was an error.')};
                    req.session.form_inputs = req.body;
                    return res.redirect('/cms/create');
                });
        }


    }
});

router.post('/edit/dateCampaign/:id', isLoggedIn, function (req, res) {
    var campaign_id = req.params.id;
    var errors = formValidators.validateEditDateCampaign(req);
    var form_stores = [];
    for (var i = 0; i < req.body.store.length; i++) {
        form_stores.push(parseInt(req.body.store));
    }
    if (!req.session.dateCampaign_inputs) {
        req.session.dateCampaign_inputs = {};
        req.session.dateCampaign_errors = {};
    }
    if (errors) {
        req.session.dateCampaign_inputs[campaign_id] = req.body;
        req.session.dateCampaign_errors[campaign_id] = errors;
        res.redirect('/cms/edit/dateCampaign/' + campaign_id);
    } else {
        Campaign
            .find({
                where: {
                    id: campaign_id
                }
            })
            .success(function (campaign) {
                var now = new Date();
                //var launchDate = new Date(dates.stringToDate(req.body.launchDate));
                //var startDate = new Date(dates.stringToDate(req.body.startDate));
                //var endDate = new Date(dates.stringToDate(req.body.endDate));
                var launchDate = moment(req.body.launchDate, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DD HH:mm:ss');
                var startDate = moment(req.body.startDate, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DD HH:mm:ss');
                var endDate = moment(req.body.endDate, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DD HH:mm:ss');
                var oldIcon = __dirname + '/../public/' + campaign.icon;
                var oldIconWide = __dirname + '/../public/' + campaign.icon_wide;
                //if (req.files.icon) {
                //    campaign.icon = '/img/uploads//' + req.files.icon.name;
                //}

                var imgPathIcon = false;
                if (req.body.icon) {
                    var fileToUpload = base64Upload.getBase64Blob(req.body.icon);
                    if (fileToUpload) {
                        var unique = shortId.generate();
                        imgPathIcon = '/img/uploads/' + unique + fileToUpload.ext;
                        var fullImgPath = __dirname + '/../public/' + imgPathIcon;

                        fs.writeFileSync(fullImgPath, fileToUpload.base64, 'base64');
                    }
                }

                var imgPathIconWide = false;
                if (req.body.icon_wide) {
                    var fileToUpload = base64Upload.getBase64Blob(req.body.icon_wide);
                    if (fileToUpload) {
                        var unique = shortId.generate();
                        imgPathIconWide = '/img/uploads/' + unique + fileToUpload.ext;
                        var fullImgPath = __dirname + '/../public/' + imgPathIconWide;

                        fs.writeFileSync(fullImgPath, fileToUpload.base64, 'base64');
                    }
                }

                /*
                 if (campaign.launch_date < now) {
                 req.session.error = req.i18n.__('Campaign cannot be edited anymore.');
                 return res.redirect('/cms/overview');
                 }
                 */

                campaign.description = req.body.description;
                campaign.tagline = req.body.tagline;
                campaign.start_date = startDate;
                campaign.end_date = endDate;
                campaign.launch_date = launchDate;
                campaign.value = req.body.value;
                campaign.store_ids = form_stores;
                campaign.icon = imgPathIcon ? imgPathIcon : campaign.icon;
                campaign.icon_wide = imgPathIconWide ? imgPathIconWide : campaign.icon_wide;

                campaign.save()
                    .success(function (campaign) {
                        var sql = "DELETE FROM campaign_store WHERE campaign_id = " + campaign.id + ";";

                        models.sequelize.query(sql)
                            .then(function () {
                                async.each(req.body.store, function (val, callback) {
                                    // Add store to campaign
                                    Store.find({where: {'id': val}})
                                        .then(function (store) {
                                            campaign.addStore(store)
                                                .then(function () {
                                                    callback();
                                                })
                                                .catch(function (err) {
                                                    callback(err);
                                                });
                                        }).catch(function (err) {
                                            callback(err);
                                        });

                                }, function (err) {
                                    if (err) {
                                        return res.send(err);
                                    } else {
                                        if (req.body.icon) {

                                            if (imgPathIcon) {
                                                // Destroy image
                                                path.exists(oldIcon, function (exists) {
                                                    if (exists) {
                                                        fs.remove(oldIcon);
                                                    }
                                                });
                                            }

                                            if (imgPathIconWide) {
                                                // Destroy image
                                                path.exists(oldIconWide, function (exists) {
                                                    if (exists) {
                                                        fs.remove(oldIconWide);
                                                    }
                                                });
                                            }
                                        }

                                        if (moment(launchDate).isAfter(moment())) {

                                            schedule.cancelJob("campaign" + campaign.id);
                                            var callback = function () {
                                                new parse.pushNewCouponToAll(req.i18n.__("New coupon: ") + req.body.tagline, 'coupon-standard-' + campaign.id);
                                            };
                                            new schedule.scheduleJob('campaign' + campaign.id, new Date(launchDate), callback);
                                        }

                                        req.session.success = req.i18n.__('Campaign successfully edited.');
                                        return res.redirect('/cms/overview');
                                    }
                                });
                            })
                            .catch(function (err) {
                                return res.status(500).send(err);
                            });
                    })
                    .error(function (err) {
                        req.session.dateCampaign_errors[campaign_id] = {unknown: req.i18n.__('There was an error.')};
                        req.session.dateCampaign_inputs[campaign_id] = req.body;
                        return res.redirect('/cms/edit/dateCampaign/' + campaign_id);
                    });
            })
            .error(function (err) {
                req.session.dateCampaign_errors[campaign_id] = {unknown: req.i18n.__('There was an error.')};
                req.session.dateCampaign_inputs[campaign_id] = req.body;
                return res.redirect('/cms/edit/dateCampaign/' + campaign_id);
            });
    }
});

router.get('/edit/dateCampaign/:id', isLoggedIn, function (req, res) {
    var campaign_id = req.params.id;

    if (req.session.user.superadmin) {
        var query = Store.findAll({});
    } else {
        var query = req.session.user.getStores();
    }

    query.success(function (stores) {
        for (var store_index in stores) {
            var store = stores[store_index];
            STORES[store.id] = store;
        }
        Campaign
            .find({
                where: {
                    id: campaign_id
                }
            })
            .success(function (campaign) {
                var now = new Date();
                res.locals.dateToString = dates.dateToString;

                var sql = "SELECT s.id " +
                    "FROM maggs_stores s " +
                    "INNER JOIN campaign_store cs ON cs.store_id = s.id " +
                    "WHERE cs.campaign_id = " + campaign.id + ";";

                models.sequelize.query(sql)
                    .then(function (campaignStores) {

                        // IDs of campaign's stores
                        var campaignStores = _.pluck(campaignStores, 'id');

                        if (campaign.end_date < now) {
                            res.render(
                                'cms/date_coupon_view',
                                {
                                    campaign: campaign,
                                    stores: STORES,
                                    campaignStores: campaignStores
                                }
                            );
                        } else {
                            if (req.session.dateCampaign_errors && req.session.dateCampaign_errors[campaign_id]) {
                                var errors = req.session.dateCampaign_errors[campaign_id];
                                var inputs = req.session.dateCampaign_inputs[campaign_id];
                                delete req.session.dateCampaign_errors[campaign_id];
                                delete req.session.dateCampaign_inputs[campaign_id];
                                return res.render('cms/date_coupon_edit', {
                                    campaign: campaign,
                                    stores: STORES,
                                    errors: errors,
                                    inputs: inputs
                                });
                            } else {
                                return res.render(
                                    'cms/date_coupon_edit',
                                    {
                                        campaign: campaign,
                                        stores: STORES,
                                        campaignStores: campaignStores
                                    }
                                );
                            }
                        }

                    })
                    .catch(function (err) {
                        return res.json(err);
                    });
            })
            .error(function (err) {
                return res.redirect('/cms/overview');
            });
    });
});

router.post('/edit/locationCampaign/:id', isLoggedIn, function (req, res) {
    var campaign_id = req.params.id;
    var errors = formValidators.validateEditLocationCampaign(req);
    if (!req.session.locationCampaign_errors) {
        req.session.locationCampaign_inputs = {};
        req.session.locationCampaign_errors = {};
    }
    if (errors) {
        req.session.locationCampaign_inputs[campaign_id] = req.body;
        req.session.locationCampaign_errors[campaign_id] = errors;
        res.redirect('/cms/edit/locationCampaign/' + campaign_id);
    } else {
        GeoCampaign
            .find(campaign_id)
            .success(function (campaign) {
                var now = new Date();
                //var startDate = new Date(dates.stringToDate(req.body.startDate));
                //var endDate = new Date(dates.stringToDate(req.body.endDate));
                var launchDate = moment(req.body.launchDate, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DD HH:mm:ss');
                var startDate = moment(req.body.startDate, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DD HH:mm:ss');
                var endDate = moment(req.body.endDate, 'DD-MM-YYYY HH:mm').format('YYYY-MM-DD HH:mm:ss');
                if (!(req.body.campaignLocation instanceof Array)) {
                    req.body.campaignLocation = [req.body.campaignLocation];
                }
                var beacon_ids = [];
                for (var index in req.body.campaignLocation) {
                    beacon_ids.push(parseInt(req.body.campaignLocation[index]));
                }
                var oldIcon = __dirname + '/../public/' + campaign.icon;
                var oldIconWide = __dirname + '/../public/' + campaign.icon_wide;
                //if (req.files.icon) {
                //    campaign.icon = '/img/uploads/' + req.files.icon.name;
                //}
                var imgPathIcon = false;
                if (req.body.icon) {
                    var fileToUpload = base64Upload.getBase64Blob(req.body.icon);
                    if (fileToUpload) {
                        var unique = shortId.generate();
                        imgPathIcon = '/img/uploads/' + unique + fileToUpload.ext;
                        var fullImgPath = __dirname + '/../public/' + imgPathIcon;

                        fs.writeFileSync(fullImgPath, fileToUpload.base64, 'base64');
                    }
                }

                var imgPathIconWide = false;
                if (req.body.icon_wide) {
                    var fileToUpload = base64Upload.getBase64Blob(req.body.icon_wide);
                    if (fileToUpload) {
                        var unique = shortId.generate();
                        imgPathIconWide = '/img/uploads/' + unique + fileToUpload.ext;
                        var fullImgPath = __dirname + '/../public/' + imgPathIconWide;

                        fs.writeFileSync(fullImgPath, fileToUpload.base64, 'base64');
                    }
                }
                /*
                 if (campaign.start_date < now) {
                 req.session.error = req.i18n.__('Campaign cannot be edited anymore.');
                 return res.redirect('/cms/overview');
                 } else {
                 */
                campaign.description = req.body.description;
                campaign.tagline = req.body.tagline;
                campaign.start_date = startDate;
                campaign.end_date = endDate;
                campaign.value = req.body.value;
                campaign.beacon_ids = beacon_ids;
                campaign.icon = imgPathIcon ? imgPathIcon : campaign.icon;
                campaign.icon_wide = imgPathIconWide ? imgPathIconWide : campaign.icon_wide;

                campaign.save()
                    .success(function (campaign) {
                        if (req.files.icon) {
                            var icon_location = path.join(__dirname, '../' + req.files.icon.path);

                            if (imgPathIcon) {
                                path.exists(oldIcon, function (exists) {
                                    if (exists) {
                                        fs.remove(oldIcon);
                                    }
                                });
                            }

                            if (imgPathIconWide) {
                                path.exists(oldIconWide, function (exists) {
                                    if (exists) {
                                        fs.remove(oldIconWide);
                                    }
                                });
                            }
                        }
                        req.session.success = req.i18n.__('Campaign successfully edited.');
                        return res.redirect('/cms/overview');
                    })
                    .error(function (err) {
                        req.session.locationCampaign_errors[campaign_id] = {unknown: req.i18n.__('There was an error.')};
                        req.session.locationCampaign_inputs[campaign_id] = req.body;
                        return res.redirect('/cms/edit/locationCampaign/' + campaign_id);
                    });
                /*
                 }
                 */

            })
            .error(function (err) {
                req.session.locationCampaign_errors[campaign_id] = {unknown: req.i18n.__('There was an error.')};
                req.session.locationCampaign_inputs[campaign_id] = req.body;
                return res.redirect('/cms/edit/locationCampaign/' + campaign_id);
            });
    }
});

router.get('/edit/locationCampaign/:id', isLoggedIn, function (req, res) {
    var campaign_id = req.params.id;
    if (req.session.user.superadmin) {
        var query = Store.findAll({});
    } else {
        var query = req.session.user.getStores();
    }

    query.success(function (stores) {
        //Beacon.findAll({})

        var sql = "SELECT b.* " +
            "FROM maggs_beacons b " +
            "INNER JOIN maggs_stores s ON b.store_id = s.id ";
        if (!req.session.user.superadmin) {
            sql += "INNER JOIN user_store us ON us.store_id = s.id " +
                "WHERE us.user_id = " + req.session.user.id + " ";
        }

        sql += " AND b.cash_register = false ";

        models.sequelize.query(sql).success(function (beacons) {

            for (var store_index in stores) {
                var store = stores[store_index];

                store.dataValues['beacons'] = [];
                STORES[store.id] = store;
            }

            for (var beacon_index in beacons) {
                var beacon = beacons[beacon_index];
                STORES[beacon.store_id].dataValues['beacons'].push(beacon);
            }
            models.sequelize
                .query(
                "SELECT g.*, count(p.geo_campaign_id) " +
                "FROM maggs_geo_campaigns g " +
                "LEFT JOIN maggs_pushed_geo_coupons p " +
                "ON p.geo_campaign_id = g.id " +
                "WHERE g.id = " + campaign_id + " " +
                "GROUP BY g.id;"
            )
                .success(function (campaign) {
                    var campaign = campaign[0];
                    var now = new Date();
                    res.locals.dateToString = dates.dateToString;

                    if (campaign.end_date < now) {
                        return res.render(
                            'cms/location_coupon_view',
                            {
                                campaign: campaign,
                                stores: STORES
                            }
                        );
                    } else {
                        if (req.session.locationCampaign_errors && req.session.locationCampaign_errors[campaign_id]) {
                            var errors = req.session.locationCampaign_errors[campaign_id];
                            var inputs = req.session.locationCampaign_inputs[campaign_id];
                            delete req.session.locationCampaign_errors[campaign_id];
                            delete req.session.locationCampaign_inputs[campaign_id];
                            return res.render('cms/location_coupon_edit', {
                                campaign: campaign,
                                stores: STORES,
                                errors: errors,
                                inputs: inputs
                            });
                        } else {
                            return res.render(
                                'cms/location_coupon_edit',
                                {
                                    campaign: campaign,
                                    stores: STORES
                                }
                            );
                        }
                    }
                })
                .error(function (err) {
                    return res.redirect('/cms/overview');
                });
        });
    });
});

router.get('/delete/dateCampaign/:id', isLoggedIn, function (req, res) {
    var campaign_id = req.params.id;
    Campaign
        .find({
            where: {
                id: campaign_id
            }
        })
        .success(function (campaign) {
            var now = new Date();
            if (campaign.launch_date < now) {
                req.session.error = req.i18n.__('Campaign cannot be deleted anymore.');
                return res.redirect('/cms/overview');
            }
            var oldIcon = campaign.icon;
            campaign.destroy()
                .success(function () {

                    var pathIcon = __dirname + '/../public' + campaign.icon;
                    var pathIconWide = __dirname + '/../public' + campaign.icon_wide;

                    // Destroy image
                    path.exists(pathIcon, function (exists) {
                        if (exists) {
                            fs.remove(pathIcon);
                        }
                    });
                    path.exists(pathIconWide, function (exists) {
                        if (exists) {
                            fs.remove(pathIconWide);
                        }
                    });


                    schedule.scheduledJobs['campaign' + campaign_id].cancel();
                    delete schedule.scheduledJobs['campaign' + campaign_id];
                    req.session.success = req.i18n.__('Campaign successfully deleted.');
                    return res.redirect('/cms/overview');
                })
                .error(function () {
                    req.session.error = req.i18n.__('Campaign not deleted.');
                    return res.redirect('/cms/overview');
                });
        })
        .error(function (err) {
            req.session.error = req.i18n.__('Campaign not deleted.');
            return res.redirect('/cms/overview');
        });
});

router.get('/delete/locationCampaign/:id', isLoggedIn, function (req, res) {
    var campaign_id = req.params.id;
    GeoCampaign
        .find(campaign_id)
        .success(function (campaign) {
            var now = new Date();
            if (campaign.start_date < now) {
                req.session.error = req.i18n.__('Campaign cannot be deleted anymore.');
                return res.redirect('/cms/overview');
            }
            campaign.destroy()
                .success(function () {
                    var pathIcon = __dirname + '/../public' + campaign.icon;
                    var pathIconWide = __dirname + '/../public' + campaign.icon_wide;

                    // Destroy image
                    path.exists(pathIcon, function (exists) {
                        if (exists) {
                            fs.remove(pathIcon);
                        }
                    });
                    path.exists(pathIconWide, function (exists) {
                        if (exists) {
                            fs.remove(pathIconWide);
                        }
                    });

                    req.session.success = req.i18n.__('Campaign successfully deleted.');
                    return res.redirect('/cms/overview');
                })
                .error(function () {
                    req.session.error = req.i18n.__('Campaign not deleted.');
                    return res.redirect('/cms/overview');
                });
        })
        .error(function (err) {
            req.session.error = req.i18n.__('Campaign not deleted.');
            return res.redirect('/cms/overview');
        });
});

router.get('/overview', isLoggedIn, function (req, res) {
    res.locals.dateToString = dates.dateToString;
    var message = req.session.success;
    req.session.success = null;
    var error = req.session.error;
    req.session.error = null;

    if (req.session.user.superadmin) {
        var query = Store.findAll({});
    } else {
        var query = req.session.user.getStores();
    }

    query
        .success(function (stores) {
            for (var store_index in stores) {
                var store = stores[store_index];
                STORES[store.id] = store;
            }
            Beacon.findAll({})
                .success(function (beacons) {
                    for (var beacon_index in beacons) {
                        var beacon = beacons[beacon_index];
                        BEACONS[beacon.id] = beacon;
                    }
                    var now = new moment().format('YYYY-MM-DD HH:mm:ss+02');
                    var sql = "SELECT * " +
                        "FROM maggs_campaigns c " +
                        "INNER JOIN campaign_store cs ON cs.campaign_id = c.id " +
                        "INNER JOIN maggs_stores s ON s.id = cs.store_id " +
                        "INNER JOIN user_store us ON us.store_id = s.id " +
                        "WHERE us.user_id = " + req.session.user.id + " " +
                        "AND c.start_date <= '" + now + "' AND c.end_date > '" + now + "' " +
                        "ORDER BY end_date ASC;";

                    if (req.session.user.superadmin) {
                        var query = Campaign.findAll({
                            where: {
                                start_date: {
                                    lte: now
                                },
                                end_date: {
                                    gte: now
                                }
                            },
                            order: 'end_date ASC'
                        });
                    } else {
                        var query = models.sequelize.query(sql, Campaign);
                    }

                    query
                        .success(function (active_date_campaigns) {
                            //console.log('-----------------------------------',active_date_campaigns);
                            var sql = "SELECT * " +
                                "FROM maggs_campaigns c " +
                                "INNER JOIN campaign_store cs ON cs.campaign_id = c.id " +
                                "INNER JOIN maggs_stores s ON s.id = cs.store_id " +
                                "INNER JOIN user_store us ON us.store_id = s.id " +
                                "WHERE us.user_id = " + req.session.user.id + " " +
                                "AND c.start_date > '" + now + "' " +
                                "ORDER BY c.start_date ASC;";

                            if (req.session.user.superadmin) {
                                var query = Campaign.findAll({
                                    where: {
                                        start_date: {
                                            gt: now
                                        }
                                    },
                                    order: 'start_date ASC'
                                });
                            } else {
                                var query = models.sequelize.query(sql, Campaign);
                            }

                            query
                                .success(function (future_date_campaigns) {
                                    var date_campaigns = active_date_campaigns.concat(future_date_campaigns);
                                    var sql = "SELECT * " +
                                        "FROM maggs_campaigns c " +
                                        "INNER JOIN campaign_store cs ON cs.campaign_id = c.id " +
                                        "INNER JOIN maggs_stores s ON s.id = cs.store_id " +
                                        "INNER JOIN user_store us ON us.store_id = s.id " +
                                        "WHERE us.user_id = " + req.session.user.id + " " +
                                        "AND c.start_date <= '" + now + "' AND c.end_date < '" + now + "' " +
                                        "ORDER BY c.end_date DESC;";

                                    if (req.session.user.superadmin) {
                                        var query = Campaign.findAll({
                                            where: {
                                                start_date: {
                                                    lte: now
                                                },
                                                end_date: {
                                                    lt: now
                                                }
                                            },
                                            order: 'end_date DESC'
                                        });
                                    } else {
                                        var query = models.sequelize.query(sql, Campaign);
                                    }

                                    query
                                        .success(function (other_date_campaigns) {
                                            var now = moment();
                                            date_campaigns = date_campaigns.concat(other_date_campaigns);
                                            models.sequelize.query(
                                                "SELECT g.*, count(p.geo_campaign_id) " +
                                                "FROM maggs_geo_campaigns g " +
                                                "LEFT JOIN maggs_pushed_geo_coupons p " +
                                                "ON p.geo_campaign_id = g.id " +
                                                "WHERE g.end_date > '" + now.format('YYYY-MM-DD hh:mm') + "' " +
                                                "GROUP BY g.id " +
                                                "ORDER BY g.end_date ASC;",
                                                GeoCampaign
                                            )
                                                .success(function (active_location_campaigns) {
                                                    models.sequelize.query(
                                                        "SELECT g.*, count(p.geo_campaign_id) " +
                                                        "FROM maggs_geo_campaigns g " +
                                                        "LEFT JOIN maggs_pushed_geo_coupons p " +
                                                        "ON p.geo_campaign_id = g.id " +
                                                        "WHERE g.end_date <= '" + now.format('YYYY-MM-DD hh:mm') + "' " +
                                                        "GROUP BY g.id " +
                                                        "ORDER BY g.end_date ASC;",
                                                        GeoCampaign
                                                    )
                                                        .success(function (past_location_campaigns) {
                                                            var location_campaigns = active_location_campaigns.concat(past_location_campaigns);
                                                            for (var i in location_campaigns) {
                                                                var location_campaign = location_campaigns[i];
                                                                location_campaign['beacons'] = [];
                                                                for (var j in location_campaign.beacon_ids) {
                                                                    var beacon_id = location_campaign.beacon_ids[j];
                                                                    //location_campaign['beacons'].push(req.i18n.__(BEACONS[beacon_id].name) + " (" + STORES[BEACONS[beacon_id].major].name + ")");
                                                                }
                                                            }


                                                            _.map(date_campaigns, function (camp) {
                                                                camp.getStores()
                                                                    .then(function (stores) {
                                                                        //camp['stores'] = '';
                                                                        //camp['stores'].push(stores);
                                                                        camp.allStores = stores;
                                                                    })
                                                                    .catch(function (err) {
                                                                        return res.status(500).json(err);
                                                                    })
                                                            });

                                                            // Get stores for each campaigns
                                                            async.map(date_campaigns, function (camp, cb) {
                                                                camp.dataValues.allStores = [];
                                                                Campaign.find(camp.dataValues.id).then(function (campaign) {
                                                                    var emptyStores = [];
                                                                    camp.dataValues.allStores.push(emptyStores);
                                                                    if(!campaign) cb();

                                                                    campaign.getStores()
                                                                        .then(function (stores) {
                                                                            camp.dataValues.allStores.push(stores);
                                                                            cb();
                                                                        })
                                                                        .catch(function (err) {
                                                                            cb(err);
                                                                        })
                                                                });
                                                            }, function (err) {
                                                                if (err) return res.status(500).json(err);

                                                                return res.render(
                                                                    'cms/coupon_overview',
                                                                    {
                                                                        date_campaigns: date_campaigns,
                                                                        location_campaigns: location_campaigns,
                                                                        message: message,
                                                                        error: error
                                                                    }
                                                                );

                                                            });
                                                        });
                                                });
                                        });

                                });

                        });
                });
        });

});

module.exports = router;