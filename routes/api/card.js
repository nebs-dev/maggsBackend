var express = require('express');
var router = express.Router();
var https = require('https');
var models = require('../../models');
var Card = models['maggs_card'];
var randomString = require('../../helpers/random')['randomString'];
var findMethods = require('../../models/findMethods');
var parse = require('../../helpers/parse');
var analytics = require('../../helpers/analytics');
var csv = require('csv-parse');
var fs = require('fs');
var _ = require('lodash');

router.route('/cards').get(function (req, res) {
    Card
        .findAll({})
        .success(function (cards) {
            res.json(cards);
        })
        .error(function (err) {
            res.statusCode = 500;
            console.error('err:', err);
            res.write('APIErrorServerError');
            res.end();
        });
});


router.route('/cards/import').get(function (req, res) {
    //return res.json('Nope');

    var allData = [];

    fs.createReadStream('nebsprod.csv')
        .pipe(csv({delimiter: ';', trim: true, columns: true}))
        .on('data', function (data) {

            allData.push({
                card_id: data.CardNumber
            });

        })
        .on('end', function () {

            Card.bulkCreate(allData, {fields: ['card_id']})
                .then(function () {
                    return res.json('OK');
                })
                .catch(function (err) {
                    console.log(allData);
                    return res.json(err);
                });

        })
        .on('error', function (err) {
            return res.status(500).json(err);
        });
});

module.exports = router;