"use strict";

module.exports = {
  up: function(migration, DataTypes, done) {
    migration.createTable(
      'maggs_cards', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          unique: true
        },         
        cardId: { type: DataTypes.STRING(19) },
        createdAt: { type: DataTypes.DATE },
        updatedAt: { type: DataTypes.DATE }
      }
    ); 
    done();
  },

  down: function(migration, DataTypes, done) {
    // add reverting commands here, calling 'done' when finished
    done();
  }
};
