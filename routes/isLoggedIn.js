var Store = require('../models/index')['maggs_store'];

module.exports = function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        req.session.user = req.user;
        res.locals.currentUser = req.user;

        //if(req.user.superadmin) return next();

        //switch(req.route.path) {
        //    case '/store/edit/:id':
        //    case '/store/delete/:id':
        //
        //        var store_id = req.params.id;
        //        Store.find(store_id)
        //            .then(function(store){
        //                store.hasUser(req.user)
        //                    .then(function(result){
        //                        if(!result) return next();
        //
        //                        return res.redirect('/cms/overview');
        //                    })
        //                    .catch(function(err){
        //                        return res.send(err);
        //                    });
        //            })
        //            .catch(function(){
        //                return res.send(err);
        //            });
        //
        //        break;
        //}

        return next();
    }
    req.session.redirect = req.originalUrl;
    res.redirect('/login');
};