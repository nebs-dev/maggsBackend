"use strict";

module.exports = {
  up: function(migration, DataTypes, done) {
    migration.addColumn(
      'maggs_cards',
      'points',
      {
        type: DataTypes.INTEGER
      }
    );
    done();
  },

  down: function(migration, DataTypes, done) {
    // add reverting commands here, calling 'done' when finished
    done();
  }
};
