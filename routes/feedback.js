var express = require('express');
var router = express.Router();
var models = require('../models/index.js');
var Feedback = models['maggs_feedback'];
var FeedbackAnswer = models['maggs_feedback_answer'];
var CustomerFeedback = models['maggs_customer_feedback'];
var Store = models['maggs_store'];
var Customer = models['maggs_customer'];
var parse = require('../helpers/parse');
var analytics = require('../helpers/analytics');
var formValidators = require('../helpers/formValidators');

router.route('/feedback')
    .get(function (req, res) {
        Feedback
            .find({
                order: 'id DESC'
            })
            .success(
            function (feedback) {
                if (!feedback) {
                    res.statusCode = 404;
                    res.write('APIErrorNoFeedback');
                    res.end();
                } else {
                    res.json(feedback);
                }
            }
        )
            .error(function (err) {
                res.statusCode = 500;
                res.write('APIErrorServerError');
                res.end();
            });
    });

router.route('/feedback/customer/:customer_id')
    .get(function (req, res) {
        var customer_id = req.params.customer_id;
        var form_errors = req.session.feedback_errors;
        req.session.feedback_errors = null;
        Feedback
            .find({
                order: 'id DESC'
            })
            .success(
            function (feedback) {
                if (!feedback) {
                    res.statusCode = 404;
                    res.write('APIErrorNoFeedback');
                    res.end();
                } else {
                    return res.render('iphone/feedback', {
                        feedback: feedback,
                        customer_id: customer_id,
                        form_errors: form_errors
                    });
                }
            })
            .error(function (err) {
                res.statusCode = 500;
                res.write('APIErrorServerError');
                res.end();
            });
    });

router.route('/feedback/customer')
    .post(function (req, res) {
        // todo we left old handling just in case...if no need for old methods delete everythin in else statement
        if (req.body.claim) { // claim is variable that is used in new feedback system...
            Store.find(req.body.store_id)
                .then(function (store) {
                    Customer.find({where: {'card_id': req.body.card_id}})
                        .then(function (customer) {
                            if (!customer) return res.status(404).json('user not found');
                            if (!store) return res.status(404).json('store not found');
                            CustomerFeedback.create({
                                customer_id: customer.id,
                                store_id: store.id,
                                rating: req.body.rating,
                                claim: req.body.claim,
                                comment: req.body.comment,
                                anonymous: req.body.anonymous
                            }).then(function (feedback) {
                                return res.json(feedback);
                            }).catch(function (err) {
                                return res.status(500).json(err);
                            });
                        }).catch(function (err) {
                            return res.status(500).json(err);
                        });
                }).catch(function (err) {
                    return res.status(500).json(err);
                });
        } else {
            var errors = formValidators.validateFeedback(req);
            if (errors) {
                console.log(errors);
                req.session.feedback_errors = errors;
                return res.redirect('/feedback/customer/' + req.body.CustomerId);
            }
            var Answer1 = parseInt(req.body.Answer1);
            var Answer2 = req.body.Answer2;
            var FeedbackId = req.body.FeedbackId;

            FeedbackAnswer
                .create({
                    FeedbackId: FeedbackId,
                    Answer1: Answer1,
                    Answer2: Answer2
                })
                .success(function (answer) {
                    return res.render('iphone/confirmation');
                })
                .error(function (err) {
                    res.statusCode = 500;
                    res.write('APIErrorServerError');
                    res.end();
                });
        }
    });


module.exports = router;