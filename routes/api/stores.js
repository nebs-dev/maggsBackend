var express = require('express');
var router = express.Router();
var https = require('https');
var models = require('../../models/index.js');
var Stores = models['maggs_store'];

router.route('/stores')
    .get(function (req, res) {
        console.log(models);
        Stores
            .findAll({})
            .success(function (stores) {
                res.json(stores);
            })
            .error(function (err) {
                res.statusCode = 500;
                res.write('APIErrorServerError');
                res.end();
            });
    });

router.route('/stores/:id')
    .get(function (req, res) {
        Stores
            .find({where:{id: req.params.id || 0}})
            .success(function (stores) {
                res.json(stores);
            })
            .error(function (err) {
                res.statusCode = 500;
                res.write('APIErrorServerError');
                res.end();
            });
    });


module.exports = router;