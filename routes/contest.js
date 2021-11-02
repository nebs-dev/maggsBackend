var express = require('express');
var router = express.Router();
var ContestsEntry = require('../models/index')['maggs_contest_entry'];


router.get('/:id', function (req, res) {
    ContestsEntry.find({where: {id: req.params.id}})
        .then(function(entry){
            if (!entry) return res.json('No contest entry with id ' + req.params.id);
                entry.getContest()
                    .then(function(contest){
                        entry.getCustomer()
                            .then(function(customer){
                                customer.getLevel(function (level) {

                                    var protocol = req.connection.encrypted ? 'https' : 'http';
                                    var baseUrl = protocol + '://' + req.headers.host;

                                    var data = {
                                        entry: entry,
                                        contest: contest,
                                        customer: customer,
                                        level: level,
                                        baseUrl: baseUrl
                                    }
                                    
                                    res.render('landingContestEntry', {data: data});
                                });
                            })
                    })

        })
        .catch(function(err){
            return res.send(err);
        });
});

module.exports = router;