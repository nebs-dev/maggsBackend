var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/index.js')['maggs_user'];
var randomstring = require("randomstring");
var path = require('path');

module.exports = function (passport) {

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        User
            .find(
                {
                    where: {
                        id: id
                    }
                }
            )
            .error(
                function(err) {
                    return done(err);
                }
            )
            .success(
                function(user) {
                    done(null, user);
                }
            );
    });

    passport.use('local-signup', new LocalStrategy(
        {
            usernameField : 'email',
            passwordField : 'password',
            passReqToCallback : true
        },
        function(req, email, password, done) {
            email = email.trim().toLowerCase();
            process.nextTick(function() {
                User
                    .find(
                        {
                            where: {
                                email: email
                            }
                        }
                    )
                    .error(
                        function(err) {
                            return done(err);
                        }
                    )
                    .success(
                        function(user) {
                            console.log('user: ' + user);
                            if (user) {
                                return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
                            } else {
                                User
                                    .create({
                                        email: email,
                                        password: User.generateHash(password),
                                        hash: randomstring.generate()
                                    })
                                    .success(function (user) {
                                        //var link = req.headers.origin + '/email/confirm/' + user.hash;
                                        return done(null, user, req.flash('loginMessage', 'You should have received an email to validate your account.'));
                                    })
                                    .error(function (err) {
                                        console.log(err)
                                        throw err;
                                    });
                            }
                        }
                    );
            });
        }
    ));

    passport.use('local-login', new LocalStrategy(
        {
            // by default, local strategy uses username and password, we will override with email
            usernameField : 'email',
            passwordField : 'password',
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, email, password, done) {
            email = email.trim().toLowerCase();
            User
                .find(
                    {
                        where: {
                            email: email
                        }
                    }
                )
                .error(
                    function(err) {
                        return done(null, false, req.flash('loginMessage', 'No such user.'));
                    }
                )
                .success(
                    function(user) {
                        if (!user) {
                            return done(null, false, req.flash('loginMessage', 'No such user.'));
                        }
                        if (!user.validatePassword(password)) {
                            return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));
                        }
                        if (user.email_confirmed == false) {
                            return done(null, false, req.flash('loginMessage', 'You need to confirm your account first. Check your emails.'));
                        }
                        return done(null, user);
                    }
                );
        }
    ));
};