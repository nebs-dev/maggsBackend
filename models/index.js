var fs = require('fs');
var path = require('path');
var Sequelize = require('sequelize');
var lodash = require('lodash');
var sequelize_fixtures = require('sequelize-fixtures');

// Swisscom AppCloud
//var db_uri = JSON.parse(process.env.VCAP_SERVICES)['postgresql-9.3'][0].credentials.uri;

var dbConfig = require('../config/config.json').development;
//Pivotal Cloud
//var db_uri = JSON.parse(process.env.VCAP_SERVICES)['elephantsql'][0].credentials.uri;

var sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    pool: { maxConnection: 4 }});

var db = {};

fs
    .readdirSync(__dirname)
    .filter(function (file) {
        return (file.indexOf('.') !== 0) && (file !== 'index.js') && (file !== 'findMethods.js') && (file !== 'images.js');
    })
    .forEach(function (file) {
        var model = sequelize.import(path.join(__dirname, file));
        db[model.name] = model;
    });

Object.keys(db).forEach(function (modelName) {
    if ('associate' in db[modelName]) {
        db[modelName].associate(db);
    }
});

// TODO: more relations
// TODO: move relation definitions to model modules ?
db['maggs_ipad_interaction'].belongsTo(db['maggs_customer'], { foreignKey: 'customer_id' });
db['maggs_ipad_interaction'].hasOne(db['maggs_thankyou_message'], { foreignKey: 'ipad_interaction_id' });
db['maggs_thankyou_message'].belongsTo(db['maggs_ipad_interaction'], { foreignKey: 'ipad_interaction_id' });
db['maggs_feedback'].hasMany(db['maggs_feedback_answer'], {foreignKey: 'FeedbackId'});
db['maggs_feedback_answer'].belongsTo(db['maggs_feedback'], { foreignKey: 'FeedbackId' });

// TODO: remove/make optional
sequelize_fixtures.loadFile('fixtures/beaconsStoresCustomers.yml', db);
sequelize_fixtures.loadFile('fixtures/importedUsers.yml', db);
sequelize_fixtures.loadFile('fixtures/feedbacks.yml', db);
//sequelize_fixtures.loadFile('fixtures/thankyou_message_models.yml', db);
sequelize_fixtures.loadFile('fixtures/admins.yml', db);
//sequelize_fixtures.loadFile('fixtures/contestlevels.yml', db);
//sequelize_fixtures.loadFile('fixtures/campaigns.json', db);

module.exports = lodash.extend({
    sequelize: sequelize,
    Sequelize: Sequelize
}, db);
