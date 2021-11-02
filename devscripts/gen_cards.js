"use strict";

var randomString = require('../helpers/random')['randomString'];

// Command-line parameters

var params = {};

for (var i = 2; i < process.argv.length; i ++) {

  var arg = process.argv[i];
  
  // Positional argument ?
  if (arg[0] != '-') {
    if (typeof params.count === 'undefined') params.count = parseInt(arg, 10);
    else throw new Error('Unrecognized parameter: "'+arg+'"');
  }
}

// Parameter default values
if (typeof params.count === 'undefined') params.count = 10;

// Let's go
for (var i = 0; i < params.count; i ++) {
  console.log(randomString());
}
