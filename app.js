var express = require('express');
var app = express();
var server = require('http').Server(app);
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var db = require('./models');
var findMethod = require('./models/findMethods');
var debug = require('debug')('maggs-app');
var passport = require('passport');
var session = require('express-session');
var flash = require('connect-flash');
var sass = require('node-sass');
var validator = require('express-validator');
var busboy = require('connect-busboy');
var multer = require('multer');
var dates = require('./helpers/dates');
var i18n = require('i18n-2');
var parse = require('./helpers/parse');
var schedule = require('node-schedule');
var i18n_de = new (require('i18n-2'))({locales: ['de']});
var excelHelper = require('./helpers/excelGenerate');
var Store = db['maggs_store'];
var async = require('async');
var qt = require('quickthumb');


app.use('/img', qt.static(__dirname + '/public/img'));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// send some info to all routes for view
app.all('*', function (req, res, next) {
    res.locals.url = req.url;
    next();
});

// uncomment after placing your favicon in /public
app.use(favicon(__dirname + '/public/favicons.png'));

app.use(session({
    secret: 'ilovescotchscotchyscotchscotch',
    resave: true,
    saveUninitialized: true
}));
app.use(logger('dev'));
app.use(bodyParser({limit: '10mb'}));
//app.use(bodyParser.json({limit: '50mb'}));
//app.use(bodyParser.urlencoded({limit: '50mb', extended: false}));
app.use(validator({
    customValidators: dates.customValidators
}));
app.use(cookieParser());
app.use(busboy());
app.use(multer({
    dest: './public/img/uploads/',
    changeDest: function (dest, req, res) {
        if (req.session.fileDest) {
            return dest + "/" + req.session.fileDest;
        }
        return dest;
    }
}));

i18n.expressBind(app, {
    // setup some locales - other locales default to vi silently
    locales: ['de'],
    // set the default locale
    defaultLocale: 'de',
    // set the cookie name
    cookieName: 'locale'
});

// set up the middleware
app.use(function (req, res, next) {
    req.i18n.setLocaleFromQuery();
    req.i18n.setLocaleFromCookie();
    next();
});

app.use(sass.middleware(
    {
        src: path.join(__dirname, 'sass'),
        dest: path.join(__dirname, 'public'),
        debug: true,
        prefix: 'stylesheets'
    }
));

app.use(express.static(path.join(__dirname, 'public')));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

require('./config/passport')(passport);

var index = require('./routes/index');
var cms = require('./routes/cms');
var customer = require('./routes/ipad/customer');
var employee = require('./routes/ipad/employee');
var authentication = require('./routes/authentication');
var customerAPI = require('./routes/api/customer');
var beaconAPI = require('./routes/api/beacon');
var couponAPI = require('./routes/api/coupon');
var cardAPI = require('./routes/api/card');
var statisticsAPI = require('./routes/api/statistics');
var appointmentAPI = require('./routes/api/appointment');
var storesAPI = require('./routes/api/stores');
var contestsAPI = require('./routes/api/contests');
var debugAPI = require('./routes/api/debug'); // TODO: REMOVE THIS!!!
var feedback = require('./routes/feedback');
var contest = require('./routes/contest');

app.use('/', authentication);
app.use('/', index);
app.use('/cms', cms);
app.use('/customer', customer);
app.use('/employee', employee);
app.use('/contest', contest);
app.use('/api/' + process.env.api_key, customerAPI);
app.use('/api/' + process.env.api_key, beaconAPI);
app.use('/api/' + process.env.api_key, couponAPI);
app.use('/api/' + process.env.api_key, appointmentAPI);
app.use('/api/' + process.env.api_key, cardAPI);
app.use('/api/' + process.env.api_key, statisticsAPI);
app.use('/api/' + process.env.api_key, debugAPI);
app.use('/api/' + process.env.api_key, appointmentAPI);
app.use('/api/' + process.env.api_key, storesAPI);
app.use('/api/' + process.env.api_key, contestsAPI);
app.use('/', feedback);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

var moment = require("moment");

db
    .sequelize
    .authenticate()
    .complete(function (err) {
        if (err) {
            throw err;
        }

        // Reschedule pushes for campaigns
        findMethod.getNotLaunchedCampaigns()
            .success(function (campaigns) {
                for (var i in campaigns) {
                    var campaign = campaigns[i];


                    new schedule.scheduleJob('campaign' + campaign.id, campaign.launch_date, (function(tagline, id) {
                        return function() {
                            parse.pushNewCouponToAll(i18n_de.__("New coupon: ") + tagline, 'coupon-standard-' + id);
                        }
                    })(campaign.tagline, campaign.id));

                }
            })
            .error(function (error) {
                throw error;
            });

        // Reschedule pushes for thank you messages
        var now = new Date();
        findMethod.getScheduledThankyouMessage(now)
            .success(function (messages) {
                for (var i in messages) {
                    var message = messages[i];


                    new schedule.scheduleJob('thankYou_' + message.customer_id, message.scheduled_date, (function(cid, sid, msg, feed) {
                        return function () {
                            parse.pushThankyouFeedback(cid, sid, msg, feed);
                        }
                    })(message.customer_id, message.store_id, message.message, message.feedback));
                }
            });

        // Reschedule pushes for contests
        findMethod.getPushContestsStart()
            .success(function(contests){
                for (var i in contests) {
                    var contest = contests[i];
                    if(moment().isBefore(moment(contest.start_date))) {
                        // contest start pushes

                        var message = i18n_de.__("Neuer Wettbewerb") +' '+ contest.hashtag;

                        new schedule.scheduleJob('contest' + contest.id, new Date(contest.start_date), (function(msg, id) {
                            return function() {
                                parse.pushNewContestToAll(msg,id);
                            }
                        })(message, contest.id));
                    }
                }
            });

        findMethod.getPushContestsEnd()
            .success(function(contests){
                var moment = require("moment");
                for (var i in contests) {
                    var contest = contests[i];

                    // contest end pushes
                    var message = i18n_de.__("Der")+' '+contest.hashtag+' '+i18n_de.__("Wettbewerb ist beendet. Sehen sie hier Ihre Platzierung.");

                    if(moment().isBefore(moment(contest.end_date))) {

                        new schedule.scheduleJob('contest_end' + contest.id, new Date(contest.end_date), (function(message, id) {
                            return function() {
                                parse.pushEndContest(message, id);
                            }
                        })(message, contest.id));
                    }
                }
            });

        app.set('port', process.env.VCAP_APP_PORT || 1337);


        // Cron jobs
        var CronJob = require('cron').CronJob;
        try {
            //new CronJob('1 53 12 * * 3', function() {
            new CronJob('1 1 1 * * 1', function() {
                Store.findAll({})
                    .then(function(stores){
                        async.eachSeries(stores, function (store, cb) {
                            excelHelper.storeFeedback(store.id, function(err) {
                                if(err) return cb(err);
                                cb();
                            });

                        }, function (err) {
                            if(err) console.error(err);
                        });

                    })
                    .catch(function(err){
                        console.error(err);
                    });

            }, null, true, 'Europe/Zurich');

        } catch(ex) {
            console.error("cron pattern not valid");
        }

        server.listen(app.get('port'), function () {
            debug('Express server listening on port' + app.get('port'));
        });

    });