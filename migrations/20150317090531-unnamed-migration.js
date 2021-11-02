module.exports = {
    up: function(migration, DataTypes, done) {
        // add altering commands here, calling 'done' when finished
        migration.removeColumn('maggs_feedback_answers', 'CustomerId');
        done();
    },
    down: function(migration, DataTypes, done) {
        // add reverting commands here, calling 'done' when finished
        migration.addColumn(
            'maggs_feedback_answers',
            'CustomerId',
            {
                type: DataTypes.INTEGER,
                references: 'maggs_customers',
                referencesKey: 'id',
                allowNull: true
            }
        );
        done();
    }
};
