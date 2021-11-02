var ua = require('universal-analytics');
var uuid = require('uuid');

function couponRedemptionToAnalytics(customerId, tagline, coupon_id) {
    var random = [0x10, 0x91, 0x56, 0xbe, 0xc4, 0xfb, 0xc1, 0xea, 0x71, 0xb4, 0xef, 0xe1, 0x67, 0x1c, 0x58, 0x36];
    for (var i in customerId) {
        random[i] = customerId[i];
    }
    var cid = uuid.v4({random: random});
    var visitor = ua('UA-56768751-1', cid).debug();
    var params = {
        ec: "Coupon",
        ea: "Redeem",
        el: tagline + ' (' + coupon_id + ')',
        cd1: "Bern",
        an: "iPad app",
        av: process.env.appVersion,
        uid: customerId
    };
    visitor.event(params).send();
}

function cardCreationToAnalytics(customerId, card_id) {
    var random = [0x10, 0x91, 0x56, 0xbe, 0xc4, 0xfb, 0xc1, 0xea, 0x71, 0xb4, 0xef, 0xe1, 0x67, 0x1c, 0x58, 0x36];
    for (var i in customerId) {
        random[i] = customerId[i];
    }
    var cid = uuid.v4({random: random});
    var visitor = ua('UA-56768751-1', cid).debug();
    var params = {
        ec: "Card",
        ea: "Create New",
        el: 'Card ID: ' + card_id + ', Customer ID: ' + customerId,
        an: "MaggsAPI",
        av: process.env.appVersion,
        uid: customerId
    };
    visitor.event(params).send();
}

function useExistingCardToAnalytics(customerId, card_id) {
    var random = [0x10, 0x91, 0x56, 0xbe, 0xc4, 0xfb, 0xc1, 0xea, 0x71, 0xb4, 0xef, 0xe1, 0x67, 0x1c, 0x58, 0x36];
    for (var i in customerId) {
        random[i] = customerId[i];
    }
    var cid = uuid.v4({random: random});
    var visitor = ua('UA-56768751-1', cid).debug();
    var params = {
        ec: "Card",
        ea: "Use Existing",
        el: 'Card ID: ' + card_id + ', Customer ID: ' + customerId,
        an: "MaggsAPI",
        av: process.env.appVersion,
        uid: customerId
    };
    visitor.event(params).send();
}

function screenView(userId, screenname) {
    var random = [0x10, 0x91, 0x56, 0xbe, 0xc4, 0xfb, 0xc1, 0xea, 0x71, 0xb4, 0xef, 0xe1, 0x67, 0x1c, 0x58, 0x36];
    for (var i in userId) {
        random[i] = userId[i];
    }
    var cid = uuid.v4({random: random});
    var visitor = ua('UA-56768751-1', cid).debug();
    var params = {
        cd: screenname,
        an: "MaggsAPI",
        av: process.env.appVersion,
        uid: userId
    };
    visitor.screenview(params).send();
}

function screenviewFromAppToAnalytics(screenName, userId, appName, appVersion, queueTime) {
    var random = [0x10, 0x91, 0x56, 0xbe, 0xc4, 0xfb, 0xc1, 0xea, 0x71, 0xb4, 0xef, 0xe1, 0x67, 0x1c, 0x58, 0x36];
    for (var i in userId) {
        random[i] = userId[i];
    }
    var cid = uuid.v4({random: random});
    var visitor = ua('UA-56768751-1', cid).debug();
    var params = {
        cd: screenName,
        an: appName,
        av: appVersion,
        uid: userId,
        qt: queueTime
    };
    visitor.screenview(params).send();
    console.log('App event sent to GA')
    console.log('*******************************')
}

function eventFromAppToAnalytics(category, action, label, userId, value, appName, appVersion, queueTime) {
    var random = [0x10, 0x91, 0x56, 0xbe, 0xc4, 0xfb, 0xc1, 0xea, 0x71, 0xb4, 0xef, 0xe1, 0x67, 0x1c, 0x58, 0x36];
    for (var i in userId) {
        random[i] = userId[i];
    }
    var cid = uuid.v4({random: random});

    var visitor = ua('UA-56768751-1', cid).debug();
    var params = {
        ec: category,
        ea: action,
        el: label,
        uid: userId,
        ev: value,
        an: appName,
        av: appVersion,
        qt: queueTime
    };
    visitor.event(params).send();
    console.log('App event sent to GA')
    console.log('*******************************')
}

module.exports = {
    couponRedemptionToAnalytics: couponRedemptionToAnalytics,
    eventFromAppToAnalytics: eventFromAppToAnalytics,
    screenView: screenView,
    screenviewFromAppToAnalytics: screenviewFromAppToAnalytics,
    cardCreationToAnalytics: cardCreationToAnalytics,
    useExistingCardToAnalytics: useExistingCardToAnalytics
};