"use strict";

var fs = require('fs');
var models = require('../models');
var Card = models['maggs_card'];
var randomString = require('../helpers/random')['randomString'];

// Command-line parameters

var params = {};

for (var i = 2; i < process.argv.length; i ++) {

  var arg = process.argv[i];
  
  // Positional argument ?
  if (arg[0] != '-') {
    if (typeof params.filename === 'undefined') params.filename = arg;
    else throw new Error('Unrecognized parameter: "'+arg+'"');
  }
}

console.log('Importing cards from file "'+params.filename+'"');

fs.readFile(params.filename, function(error, data) {
  if (error) throw error;

  var cards = [];
  data.toString().split("\n").forEach(function(line, index, arr) {
    if (index === arr.length - 1 && line === "") { return; }
    var cardId = line.trim();
    cards.push( { cardId: cardId, points: 1 });
  })
  
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
  })

});