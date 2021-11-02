module.exports = {
  up: function(migration, DataTypes, done) {
    // add altering commands here, calling 'done' when finished
    migration.addColumn(
        'maggs_customers',
        'ipad_interaction',
        {
          type: DataTypes.DATE
        }
    );
    done();
  },
  down: function(migration, DataTypes, done) {
    // add reverting commands here, calling 'done' when finished
    migration.removeColumn(
        'maggs_customers',
        'ipad_interaction'
    );
    done();
  }
};
