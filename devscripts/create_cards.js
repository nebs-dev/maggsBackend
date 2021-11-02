"use strict";

var models = require('../models');
var Card = models['maggs_card'];
var randomString = require('../helpers/random')['randomString'];

console.log('Creating 100 new phoney Maggs cards');

var cards = [];
for (var i = 0; i < 100; i ++) {
  cards.push( { cardId: randomString(), points: 1 } );
}

// sync({force:false}) is necessary so that bulkCreate() will initialize the "id" fields
// with DEFAULT rather than NULL (which would fail)
Card.sync({force:false}).then( function() {

  Card.bulkCreate(cards)
    .success(function(cards) {
      console.log('Cards created successfully:', cards);
    })
    .error(function(err) {
      console.error('Error creating cards:', err);
    })

});