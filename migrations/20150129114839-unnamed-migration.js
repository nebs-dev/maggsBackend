module.exports = {
  up: function(migration, DataTypes, done) {
    // add altering commands here, calling 'done' when finished
    migration.createTable(
        'maggs_thankyou_messages',
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
          message: {
            type: DataTypes.STRING
          },
          scheduled_date: {
            type: DataTypes.DATE
          },
          customer_id: {
            type: DataTypes.INTEGER,
            references: 'maggs_customers',
            referencesKey: 'id',
            allowNull: false
          },
          ipad_interaction_id: {
            type: DataTypes.INTEGER,
            references: 'maggs_ipad_interactions',
            referencesKey: 'id',
            allowNull: false
          },
          feedback: {
            type: DataTypes.BOOLEAN
          }
        }
    );
    done();
  },
  down: function(migration, DataTypes, done) {
    // add reverting commands here, calling 'done' when finished
    migration.dropTable('maggs_thankyou_messages', {cascade: true});
    done();
  }
}
