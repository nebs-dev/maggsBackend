module.exports = {
  up: function(migration, DataTypes, done) {
    // add altering commands here, calling 'done' when finished
      migration.createTable(
          'maggs_feedbacks',
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
            Question1: {
              type: DataTypes.STRING
            },
            Question2: {
              type: DataTypes.STRING
            },
            Question1Answers: {
              type: DataTypes.ARRAY(DataTypes.STRING)
            },
            store_id: {
              type: DataTypes.INTEGER,
              allowNull: false
            }
          }
      );
      migration.createTable(
          'maggs_feedback_answers',
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
            CustomerId: {
              type: DataTypes.INTEGER,
              references: 'maggs_customers',
              referencesKey: 'id',
              allowNull: false
            },
            FeedbackId: {
              type: DataTypes.INTEGER,
              references: 'maggs_feedbacks',
              referencesKey: 'id',
              allowNull: false
            },
            Answer1: {
              type: DataTypes.INTEGER
            },
            Answer2: {
              type: DataTypes.STRING
            }
          }
      );
      done();
    },
    down: function(migration, DataTypes, done) {
      // add reverting commands here, calling 'done' when finished
      migration.dropTable('maggs_feedback_answers', {cascade: true});
      migration.dropTable('maggs_feedbacks', {cascade: true});
      done();
    }
};
