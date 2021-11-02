var express = require('express');
var router = express.Router();
var analytics = require('../../helpers/analytics');

router.route('/statistics')
    .post(function (req, res) {
        var items = req.body;
        if (!(items instanceof Array)) {
            items = [items];
        }
        console.log('*******************************');
        console.log('received '+ items.length +' Analytics items from the App');
        console.log('*******************************');
        for (var i in items) {
            var analytic = items[i];
            var type = analytic.Type;
            var category = analytic.EventCategory || null;
            var action = analytic.EventAction || null;
            var label = analytic.EventLabel || null;
            var userId = analytic.UserId || null;
            var value = analytic.EventValue || null;
            var appName = analytic.AppName || null;
            var appVersion = analytic.AppVersion || null;
            var screenName = analytic.ScreenName || null;
            var queueTime = analytic.QueueTime || null;

            switch (type) {
                case 'event':
                    console.log('*******************************');
                    console.log('event type');
                    analytics.eventFromAppToAnalytics(category, action, label, userId, value, appName, appVersion, queueTime);
                    break;
                case 'screenview':
                    console.log('*******************************');
                    console.log('screenview type');
                    analytics.screenviewFromAppToAnalytics('LoyaltyApp / ' + screenName, userId, appName, appVersion, queueTime);
                    break;
                default:
                    console.log('*******************************');
                    console.log('unknown analytics type');
                    console.log('*******************************');
            }
        }
        res.statusCode = 200;
        res.end();
    });

module.exports = router;