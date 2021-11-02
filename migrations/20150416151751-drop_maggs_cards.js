"use strict";

module.exports = {
  up: function(migration, DataTypes, done) {
    migration.dropTable('maggs_cards', {cascade: true});
    done();
  },

  down: function(migration, DataTypes, done) {
    migration.createTable(
      'maggs_cards', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          unique: true
        },         
        cardId: { type: DataTypes.STRING(19) },
        points: { type: DataTypes.INTEGER },
        createdAt: { type: DataTypes.DATE },
        updatedAt: { type: DataTypes.DATE }
      }
    ); 
    done();
  }
};
