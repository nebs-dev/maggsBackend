var express = require('express');
var router = express.Router();
var isLoggedIn = require('./isLoggedIn');

router.get('/', isLoggedIn, function(req, res) {
    var redirect = req.session.redirect;
    if (redirect) {
        delete req.session.redirect;
        return res.redirect(redirect);
    }
    return res.redirect('/cms');
});

module.exports = router;