module.exports = function isLoggedIn(req, res, next) {
    if (req.session.user.superadmin) {
        return next();
    }
    req.session.redirect = req.originalUrl;
    res.redirect('/cms/overview');
};