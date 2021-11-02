var express = require('express');
var router = express.Router();
var https = require('https');
var models = require('../../models/index.js');
var Appointment = require('../../models/index')['maggs_appointment'];
var Store = require('../../models/index')['maggs_store'];
var Customer = models['maggs_customer'];
var async = require('async');
var _ = require('lodash');
var moment = require('moment');
var mailer = require('../../helpers/mailer');


router.route('/appointments')
    .get(function (req, res) {

        var storesArray = [];
        Store.findAll({})
            .then(function (stores) {

                var now = new moment();
                var futTime = now.add(36, 'hours').format('YYYY-MM-DD HH:mm:ss+02');

                async.each(stores, function (store, callback) {
                    var storeAppointments = {store_id: store.id, appointments: []};
                    storesArray.push(storeAppointments);

                    store.getAppointments({where: {
                                date: {
                                    gte: futTime
                                }
                            }})
                        .then(function (appointments) {

                            _.each(appointments, function (appointment) {

                                var timeSlots = [];
                                _.each(appointment.time, function (hour) {
                                    // hour is not reserved so push it in available time slots
                                    if (!parseInt(hour[1])) {
                                        timeSlots.push(parseInt(hour[0]));
                                    }

                                });

                                storeAppointments.appointments.push({
                                    id: appointment.id,
                                    date: moment(appointment.date).format('DD.MM.YYYY'),
                                    hours: timeSlots
                                });
                            });

                            callback();
                        })
                        .catch(function (err) {
                            callback(err);
                        });
                }, function (err) {
                    if (err) {
                        return res.send(err.name);
                    } else {
                        res.json(storesArray);
                    }
                })
            });
    });


router.route('/appointments/:card_id').get(function (req, res) {
    var userAppointments = [];

    Customer.find({where: {card_id: req.params.card_id}})
        .then(function (customer){
            if (!customer) return res.status(404).json('Customer not found');

            var now = new moment().format('YYYY-MM-DD HH:mm:ss+02');
            //Appointment.findAll({where: {
            //            date: {
            //                gte: now
            //            }
            //        }})

            var sql = "SELECT * FROM maggs_appointments " +
                "WHERE " +req.params.card_id+ "::text = ANY(time::text[]) " +
                "AND date >= '"+now+"' ;";

            models.sequelize.query(sql)
                .then(function (appointments){
                    _.each(appointments, function (appointment) {
                        var timeSlots = [];
                        _.each(appointment.time, function (hour) {
                            // hour is reserved by user so push it into time slots
                            if (parseInt(hour[1]) == customer.card_id) {
                                timeSlots.push(parseInt(hour[0]));
                            }
                        });

                        if (timeSlots.length) {
                            userAppointments.push({
                                id: appointment.id,
                                date: moment(appointment.date).format('DD.MM.YYYY'),
                                hours: timeSlots,
                                store_id: appointment.store_id
                            });
                        }
                    });

                    return res.json(userAppointments);
                })
        })
        .catch(function (err){
            res.status(500).json(err);
        });
});


router.route('/appointments/:store_id')
    .get(function (req, res) {
        var storeAppointments = [];
        var now = new moment();
        var futTime = now.add(36, 'hours').format('YYYY-MM-DD HH:mm:ss+02');

        Store.find(req.params.store_id)
            .then(function (store) {
                store.getAppointments({where: {
                        date: {
                            gte: futTime
                        }
                    }})
                    .then(function (appointments) {
                        _.each(appointments, function (appointment) {
                            var timeSlots = [];
                            _.each(appointment.time, function (hour) {
                                // hour is not reserved so push it in available time slots
                                if (!parseInt(hour[1])) {
                                    timeSlots.push(parseInt(hour[0]));
                                }
                            });

                            storeAppointments.push({
                                id: appointment.id,
                                date: moment(appointment.date).format('DD.MM.YYYY'),
                                hours: timeSlots
                            });
                        });

                        res.json(storeAppointments);

                    })
                    .catch(function (err) {
                        res.status(500).json(err);
                    });


            }).catch(function (err) {
                res.status(500).json(err);
            });
    });


router.route('/appointment/book/:appointmentid')
    .post(function (req, res) {
        Appointment.find({
            where: {
                id: req.params.appointmentid
            }, include: [{model: Store, as: 'Store'}]
        }).then(function (appointment) {
            if (!appointment) return res.status(404).json('not found');
            if (!req.body.time) return res.status(400).json('Time of appointment not set');
            if (!req.body.card_id) return res.status(400).json('No card_id');

            Customer.find({where: {card_id: req.body.card_id}}).then(function (customer) {
                if (!customer) return res.status(404).json('Customer not found');

                var found = _.find(appointment.time, function (time) {
                    return time.indexOf(req.body.time) > -1;
                });

                if (!found) return res.status(404).json('time slot not found in that appointment');

                found = appointment.time.indexOf(found);

                if (appointment.time[found][1] !== "0") return res.status(400).json('appointment already booked!');

                appointment.time[found][1] = req.body.card_id;
                appointment.save().then(function () {

                    if (!appointment.store.storemanagerEmail) return res.status(404).json('appointmen created, but stora manager email not found!');

                    var protocol = req.connection.encrypted ? 'https' : 'http';
                    var baseUrl = protocol + '://' + req.headers.host + '/';
                    //baseUrl = "http://maggs-test.smartfactory.ch/";

                    var maleSize = (req.body.maleSize) ? JSON.parse(req.body.maleSize) : false;
                    var femaleSize = (req.body.femaleSize) ? JSON.parse(req.body.femaleSize) : false;
                    var message = (req.body.message) ? req.body.message : false;
                    var phone = (req.body.phone) ? req.body.phone : false;
                    var sex = (req.body.sex =='male' || req.body.sex =='female') ? req.body.sex : false;

                    mailer.sendEmail({
                        template: 'appointmentRequest',
                        to: appointment.store.storemanagerEmail,
                        //to: 'roger@smartfactory.ch',
                        subject: 'NEW APPOINTMENT - ' + appointment.store.name
                    }, {
                        date: moment(appointment.date).format('DD.MM.YYYY'),
                        time: req.body.time,
                        card_id: customer.card_id,
                        firstName: customer.firstname,
                        lastName: customer.lastname,
                        baseUrl: baseUrl,
                        store: appointment.store,
                        message: message,
                        phone: phone,
                        maleSize: maleSize,
                        femaleSize: femaleSize,
                        sex: sex
                    }, function (err, msg) {
                        if (err) res.status(500).json('appointed booked, but email was not sent to manager!');

                        res.json('appointment booked!');
                    });


                }).catch(function (err) {
                    res.status(500).json(err);
                });
            }).catch(function (err) {
                res.status(500).json(err);
            });
        }).catch(function (err) {
            res.status(500).json(err);
        });
    });

router.route('/appointment/remove/:appointmentid')
    .post(function (req, res) {
        Appointment.find({
            where: {
                id: req.params.appointmentid
            }, include: [{model: Store, as: 'Store'}]
        }).then(function (appointment) {
            if (!appointment) return res.status(404).json('not found');
            if (!req.body.time) return res.status(400).json('Time of appointment not set');
            if (!req.body.card_id) return res.status(400).json('No card_id');

            Customer.find({where: {card_id: req.body.card_id}}).then(function (customer) {
                if (!customer) return res.status(404).json('Customer not found');

                var found = _.find(appointment.time, function (time) {
                    return time.indexOf(req.body.time) > -1;
                });

                if (!found) return res.status(404).json('time slot not found in that appointment');

                found = appointment.time.indexOf(found);

                if (appointment.time[found][1] === "0") return res.status(400).json('appointment is not booked!');
                if (appointment.time[found][1] !== req.body.card_id) return res.status(400).json('appointment is not owned by this customer!');

                appointment.time[found][1] = 0;
                appointment.save().then(function () {

                    if (!appointment.store.storemanagerEmail) return res.status(404).json('appointmen removed, but stora manager email not found!');

                    var protocol = req.connection.encrypted ? 'https' : 'http';
                    var baseUrl = protocol + '://' + req.headers.host + '/';
                    //baseUrl = "http://maggs-test.smartfactory.ch/";

                    mailer.sendEmail({
                        template: 'appointmentRequest',
                        to: appointment.store.storemanagerEmail,
                        //to: 'roger@smartfactory.ch',
                        subject: 'APPOINTMENT REMOVED - ' + appointment.store.name
                    }, {
                        deleteAppointment: true,
                        date: moment(appointment.date).format('DD.MM.YYYY'),
                        time: req.body.time,
                        card_id: customer.card_id,
                        firstName: customer.firstname,
                        lastName: customer.lastname,
                        baseUrl: baseUrl,
                        store: appointment.store
                    }, function (err, msg) {
                        if (err) res.status(500).json('appointed removed, but email was not sent to manager!');

                        res.json('appointment removed!');
                    });


                }).catch(function (err) {
                    res.status(500).json(err);
                });
            }).catch(function (err) {
                res.status(500).json(err);
            });
        }).catch(function (err) {
            res.status(500).json(err);
        });
    });

module.exports = router;
