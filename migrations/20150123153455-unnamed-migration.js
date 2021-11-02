module.exports = {
  up: function(migration, DataTypes, done) {
    // add altering commands here, calling 'done' when finished
    migration.removeColumn(
        'maggs_customers',
        'ipad_interaction'
    );
    migration.createTable(
        'maggs_ipad_interactions',
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          createdAt: {
            type: DataTypes.DATE
          },
          updatedAt: {
            type: DataTypes.DATE
          },
          customer_id: {
            type: DataTypes.INTEGER,
            references: 'maggs_customers',
            referencesKey: 'id',
            allowNull: false
          },
          store_id: {
            type: DataTypes.INTEGER,
            references: 'maggs_stores',
            referencesKey: 'id',
            allowNull: false
          }
        }
    );
    done();
  },
  down: function(migration, DataTypes, done) {
    // add reverting commands here, calling 'done' when finished
    migration.dropTable('maggs_ipad_interactions', {cascade: true});
    migration.addColumn(
        'maggs_customers',
        'ipad_interaction',
        {
          type: DataTypes.DATE
        }
    );
    done();
  }
}
