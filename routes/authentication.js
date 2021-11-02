var express = require('express');
var router = express.Router();
var passport = require('passport');
var User = require('../models/index.js')['maggs_user'];

router.get('/login', function(req, res) {
    res.render('login', { title: 'Express', message: req.flash('loginMessage') });
});

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

//router.get('/signup', function(req, res, next) {
//    res.render('signup', { message: req.flash('signupMessage') });
//});

router.get('/email/confirm/:hash', function(req, res) {
    User
        .find({
            where: {
                hash: req.params.hash
            }
        })
        .error(function(err) {
            res.render('login', { message: err });
        })
        .success(function(user) {
            if (!user) {
                res.render('login', { message: 'This URL is not correct.' });
            }
            if (user.email_confirmed) {
                res.render('login', { message: 'This user has already been confirmed.' });
            }
            user.updateAttributes({email_confirmed: true})
                .success(function () {
                    res.render('login', { message: 'User confirmed! Please login.' });
                });
        });
});

router.post('/signup',
    passport.authenticate('local-signup',
        {
            successRedirect: '/logout',
            failureRedirect: '/signup',
            failureFlash: true
        }
    )
);

router.post('/login',
    passport.authenticate('local-login',
        {
            successRedirect: '/',
            failureRedirect: '/login',
            failureFlash: true
        }
    )
);

module.exports = router;