"use strict";

var Sequelize = require('sequelize');
var models = require('../models/index');
var _ = require('lodash');

var Campaign = models['maggs_campaign'];
var Customer = models['maggs_customer'];
var Store = models['maggs_store'];
var UsedCoupon = models['maggs_used_coupon'];

/*
Customer.findAll({})
  .then( function(customers) {
    console.log('-----------------------------');
    console.log('findAll() done');
    _.each(customers, function(customer) {
      console.log('Customer:', customer);
    })
  })
*/

/*
Customer.describe()
  .then( function(attribs) {
    console.log('-----------------------------');
    console.log('describe() ->');
    _.each(attribs, function(attr, name) {
      console.log(name + ':', attr);
    })
  })
*/

UsedCoupon.belongsTo(Campaign, { foreignKey: 'campaign_id', as: 'campaign' });
UsedCoupon.belongsTo(Store   , { foreignKey: 'store_id'   , as: 'store'    });
UsedCoupon.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Customer.hasMany(UsedCoupon, { foreignKey: 'customer_id', as: 'used_coupons' });

/*
UsedCoupon.describe()
  .then( function(attribs) {
    console.log('-----------------------------');
    console.log('UsedCoupon:');
    _.each(attribs, function(attr, name) {
      console.log(name + ':', attr);
    })
  })
*/

if (0) {

UsedCoupon.findAll({ 
    include: [
      // Note: unfortunately, it appears to be necessary to specify the aliases again 
      // here, even though Sequelize should know them from the belongsTo clauses.
      { model: Campaign, as: 'campaign' }, 
      { model: Customer, as: 'customer' }, 
      { model: Store   , as: 'store'    } 
    ]}
  )
  .then( function(coupons) {
    console.log('-----------------------------');
    console.log('findAll() done');
    _.each(coupons, function(coupon) {
      console.log('Coupon:');
      var customer = coupon.get('customer');
      console.log('  Customer:', customer.get('firstname'), customer.get('lastname') );
      var campaign = coupon.get('campaign');
      console.log('  Campaign:', campaign.get('description'));
      var store = coupon.get('store');
      console.log('  Store:', store.get('name'));
      console.log('  Date:', coupon.get('date'));
    })
  })
  
} // if (0)

Customer.findAll({
    include: [
      { model: UsedCoupon, as: 'used_coupons', include: [ { model: Campaign, as: 'campaign' } ] }
    ]
  })
  .then( function(customers) {
    console.log('-----------------------------');
    console.log('Customer.findAll() ->');
    _.each(customers, function(customer) {
      var usedCoupons = customer.get('usedCoupons');
      if (usedCoupons.length > 0) {
        console.log('Customer:');
        console.log('  Name:', customer.get('firstname'), customer.get('lastname') );
        console.log('  Used coupons:');
        _.each(usedCoupons, function(coupon, i) {
            console.log('    ' + (i + 1).toString(), coupon.get('campaign').get('description'));
        });
      }
    })
  })
