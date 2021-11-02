var dates = require('./dates');

function validateAnyCampaign (req) {
    req.assert('tagline', req.i18n.__('is required.')).notEmpty();
    if (req.body.tagline) {
        req.assert('tagline', req.i18n.__('text too long (max. %s characters).', 30)).len(0, 30);
    }
    req.assert('startDate', req.i18n.__('is required.')).notEmpty();
    req.assert('endDate', req.i18n.__('is required.')).notEmpty();
    if (req.body.startDate && req.body.endDate) {
        req.assert('endDate', req.i18n.__('invalid date format.')).isADateString();
        if (dates.customValidators.isADateString(req.body.endDate)) {
            req.assert('endDate', req.i18n.__('must be later than %s.', req.i18n.__('Start date'))).dateGreaterThan(req.body.startDate);
        }
    }
    req.assert('description', req.i18n.__('is required.')).notEmpty();
    if (req.body.description) {
        req.assert('description', req.i18n.__('text too long (max. %s characters).', 1000)).len(0, 1000);
    }
    req.assert('value', req.i18n.__('is required.')).notEmpty();
    if (req.body.value) {
        req.assert('value', req.i18n.__('text too long (max. %s characters).', 6)).len(0, 6);
    }
}

function validateCreateCampaign (req) {
    var now = new Date();
    req.assert('campaignType', req.i18n.__('is required.')).notEmpty();
    if (req.body.campaignType == 'date') {
        req.assert('launchDate', req.i18n.__('is required.')).notEmpty();
        if (req.body.launchDate) {
            req.assert('launchDate', req.i18n.__('invalid date format.')).isADateString();
            if (dates.customValidators.isADateString(req.body.launchDate)) {
                //req.assert('launchDate', req.i18n.__('must be in the future.')).dateGreaterThan(now);
            }
        }
    } else {
        req.assert('campaignLocation', req.i18n.__('is required.')).notEmpty();
    }
    if (req.body.startDate) {
        req.assert('startDate', req.i18n.__('invalid date format.')).isADateString();
        console.log('dates.customValidators.isADateString(req.body.startDate): ' + dates.customValidators.isADateString(req.body.startDate))
        if (dates.customValidators.isADateString(req.body.startDate)) {
            if (req.body.campaignType == 'date') {
                req.assert('startDate', req.i18n.__('must be later than %s.', req.i18n.__('Launch date'))).dateGreaterOrEqualThan(req.body.launchDate);
            } else {
                //req.assert('startDate', req.i18n.__('must be in the future.')).dateGreaterThan(now);
            }
        }
    }
    validateAnyCampaign(req);

    var errors = req.validationErrors(true);

    if (!req.body.icon) {
        if (!errors) {
            errors = {};
        }
        errors.icon = {
            param: 'icon',
            msg: req.i18n.__('is required.')
        };
    }
    //else {
    //    if (req.body.icon.size > 512000) {
    //        errors.icon = {
    //            param: 'icon',
    //            msg: req.i18n.__('max. image size is 500KB.')
    //        };
    //    }
    //}
    return errors;
}

function validateEditDateCampaign (req) {
    var now = new Date();
    if (req.body.startDate) {
        req.assert('startDate', req.i18n.__('invalid date format.')).isADateString();
        if (dates.customValidators.isADateString(req.body.startDate)) {
            req.assert('startDate', req.i18n.__('must be later than %s.', req.i18n.__('Launch date'))).dateGreaterOrEqualThan(req.body.launchDate);
        }
    }
    if (req.body.launchDate) {
        req.assert('launchDate', req.i18n.__('invalid date format.')).isADateString();
        if (dates.customValidators.isADateString(req.body.launchDate)) {
            //req.assert('launchDate', req.i18n.__('must be in the future.')).dateGreaterThan(now);
        }
    }
    validateAnyCampaign(req);
    var errors = req.validationErrors(true);
    return errors;
}

function validateEditLocationCampaign (req) {
    var now = new Date();
    req.assert('campaignLocation', req.i18n.__('is required.')).notEmpty();
    if (req.body.startDate) {
        req.assert('startDate', req.i18n.__('invalid date format.')).isADateString();
        if (dates.customValidators.isADateString(req.body.startDate)) {
            //req.assert('startDate', req.i18n.__('must be in the future.')).dateGreaterThan(now);
        }
    }
    validateAnyCampaign(req);
    var errors = req.validationErrors(true);
    return errors;
}

function validateEditCustomer (req) {
    if (req.body.hints) {
        req.assert('hints', req.i18n.__('text too long (max. %s characters).', 5000)).len(0, 5000);
    }
    var errors = req.validationErrors(true);
    return errors;
}

function validateFeedback (req) {
    req.assert('Answer1', req.i18n.__('Please select one of the following option.')).notEmpty();
    var errors = req.validationErrors(true);
    return errors;
}

module.exports = {
    validateCreateCampaign: validateCreateCampaign,
    validateEditDateCampaign: validateEditDateCampaign,
    validateEditLocationCampaign: validateEditLocationCampaign,
    validateEditCustomer: validateEditCustomer,
    validateFeedback: validateFeedback
}