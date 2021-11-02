module.exports = {
  up: function(migration, DataTypes, done) {
    // add altering commands here, calling 'done' when finished
    migration.addColumn(
        'maggs_customers',
        'hints',
        {
          type: DataTypes.STRING(5000)
        }
    );
    done();
  },
  down: function(migration, DataTypes, done) {
    // add reverting commands here, calling 'done' when finished
    migration.removeColumn(
        'maggs_customers',
        'hints'
    );
    done();
  }
}
