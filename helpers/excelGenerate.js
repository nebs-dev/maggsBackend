var models = require('../models/index.js');
var CustomerFeedback = models['maggs_customer_feedback'];
var Customer = models['maggs_customer'];
var Store = models['maggs_store'];
var Excel = require("exceljs");
var fs = require('fs-extra');
var _ = require('lodash');
var path = require('path');
var mailer = require('../helpers/mailer');
var moment = require('moment');

module.exports = {

    storeFeedback: function (store_id, callback) {
        var lastDate = moment().subtract(7, 'day');

        CustomerFeedback.findAll({
            where: {
                store_id: store_id,
                createdAt: {
                    gte: lastDate._d
                }
            },
            order: '"createdAt" DESC',
            include: [
                {model: Customer, as: 'Customer'}
            ]
        })

            .then(function(feedbacks){
                if (!feedbacks || !feedbacks.length) return callback && callback("No feedbacks");

                var claims = _.groupBy(feedbacks, 'claim');
                var feeds = [];

                for(var claim in claims) {
                    var ratings = _.countBy(_.pluck(claims[claim], 'rating'));
                    feeds.push({key: claim, data: claims[claim], total: claims[claim].length, ratings: ratings});
                }

                // EXCEL
                var workbook = new Excel.Workbook();
                var worksheet = workbook.addWorksheet("Statistics");
                var worksheetComments = workbook.addWorksheet("Comments");

                worksheet.columns = [
                    { header: "Name", key: "name", width: 30, style: {font: {name: "Arial Black" }}, alignment: {horizontal: 'center'}},
                    { header: "1", key: "1", width: 12 },
                    { header: "2", key: "2", width: 12 },
                    { header: "3", key: "3", width: 12 },
                    { header: "4", key: "4", width: 12 },
                    { header: "5", key: "5", width: 12 },
                    { header: "Total", key: "total", width: 30, style: { font: { name: "Arial Black" } } }
                ];

                worksheetComments.columns = [
                    { header: "Created At", key: "createdAt", width: 15, style: {font: {name: "Arial Black" }}},
                    { header: "Rating", key: "rating", width: 12 },
                    { header: "Comment", key: "comment", width: 50 },
                    { header: "Customer", key: "customer", width: 30 },
                ];

                _.each(feeds, function(feed) {

                    worksheet.addRow({
                        name: feed.key,
                        1: feed.ratings[1] ? feed.ratings[1] : '-',
                        2: feed.ratings[2] ? feed.ratings[2] : '-',
                        3: feed.ratings[3] ? feed.ratings[3] : '-',
                        4: feed.ratings[4] ? feed.ratings[4] : '-',
                        5: feed.ratings[5] ? feed.ratings[5] : '-',
                        total: feed.total
                    });

                    _.each(feed.data, function(comment) {
                        if(comment.comment) {
                            worksheetComments.addRow({
                                createdAt: comment.createdAt,
                                rating: comment.rating,
                                comment: comment.comment,
                                customer: comment.anonymous ? 'Anonymous customer' : comment.customer.firstname + ' ' + comment.customer.lastname
                            });
                        }
                    });

                });


                if(feeds.length != 0) {
                    Store.find(store_id)
                        .then(function (store) {
                            workbook.xlsx.writeFile(path.join(__dirname + '/../xlsx/test.xlsx'))
                                .then(function () {

                                    var protocol = req.connection.encrypted ? 'https' : 'http';
                                    var baseUrl = protocol + '://' + req.headers.host + '/';

                                    mailer.sendEmail({
                                        template: 'statisticsReport',
                                        //to: store.storemanagerEmail,
                                        to: 'daniel.boehlen@loeb.ch, '+store.storemanagerEmail,
                                        subject: 'Statistischer Report für den Laden in ' + store.name,
                                        attachments: [{
                                            filename: 'feedbacks.xlsx',
                                            path: path.join(__dirname + '/../xlsx/test.xlsx'),
                                            baseUrl: baseUrl
                                        }]
                                    }, {
                                        store: store
                                    }, function (err, msg) {
                                        if (err) return callback && callback(err);

                                        return callback && callback();
                                    });
                                })
                                .catch(function (err) {
                                    return callback && callback(err);
                                });
                        })
                        .catch(function (err) {
                            return callback && callback(err);
                        });

                } else {
                    return callback && callback('No feeds');
                }

            })
            .catch(function(err){
                return callback && callback(err);
            });

    }
};