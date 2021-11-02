module.exports = {
  up: function(migration, DataTypes, done) {
    // add altering commands here, calling 'done' when finished
    migration.addColumn(
        'maggs_feedbacks',
        'PushText',
        {
          type: DataTypes.STRING
        }
    );
    done();
  },
  down: function(migration, DataTypes, done) {
    // add reverting commands here, calling 'done' when finished
    migration.removeColumn(
        'maggs_feedbacks',
        'PushText'
    );
    done();
  }
}
