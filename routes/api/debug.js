/* THE ROUTES IN THIS FILE ARE INTENDED FOR DEBUGGING PURPOSES *ONLY* */
var express = require('express');
var Pusher = require('pusher');
var router = express.Router();
var https = require('https');
var models = require('../../models/index.js');
//var PushedGeoCoupon = models['maggs_pushed_geo_coupon'];
var UsedCoupon = models['maggs_used_coupon'];
var findMethods = require('../../models/findMethods');

if (process.env['MAGGS_BACKEND_DEBUG']) {

  router.route('/dbg_redeemed/:customer_id')
    .get(function (req, res) {
    
      UsedCoupon.findAll({ where: { customer_id: req.params.customer_id } })
        .then( function(results) {
          res.statusCode = 200;
          res.write(JSON.stringify(results, null,'  '));
          res.end();
        })
    })

  router.route('/dbg_unredeem_all/:customer_id')
    .get(function (req, res) {
    
      UsedCoupon.destroy({ customer_id: req.params.customer_id } )
        .then( function(result) {
          res.statusCode = 200;
          res.write(JSON.stringify(result, null, '  '));
          res.end();
        })
        .error( function(err) {
          res.statusCode = 500;
          res.write(JSON.stringify(err, null, '  '));
          res.end();
        })
    })
    
} // env. var. MAGGS_BACKEND_DEBUG

module.exports = router;