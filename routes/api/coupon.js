var express = require('express');
var router = express.Router();
var https = require('https');
var models = require('../../models/index.js');
var Campaign = models['maggs_campaign'];
var Customer = models['maggs_customer'];
var randomString = require('../../helpers/random')['randomString'];
var findMethods = require('../../models/findMethods');
var parse = require('../../helpers/parse');

router.route('/coupons')
    .get(function (req, res) {
        Campaign
            .findAll({})
            .success(function (campaigns) {
                res.json(campaigns);
            })
            .error(function (err) {
                res.statusCode = 500;
                res.write('APIErrorServerError');
                res.end();
            });
    });

router.route('/coupons/customer/:customer_id')
    /*
     * GET /api/coupons/customer/<customer_id>
     * parameters:
     *      customer_id
     * returns:
     *      list of coupons not yet used by customer_id
     */
    .get(function (req, res) {
        var customer_id = req.params.customer_id;

        Customer
            .find({where: {
                id: customer_id
            }})
            .success(
            function (customer) {
                if (!customer) {
                    res.statusCode = 404;
                    res.write('APIErrorNoSuchCustomer');
                    res.end();
                } else {
                    findMethods.getCouponsByCustomerID(res, customer_id);
                }
            }
        )
            .error(function (err) {
                res.statusCode = 500;
                res.write('APIErrorServerError');
                res.end();
            });
    });

module.exports = router;