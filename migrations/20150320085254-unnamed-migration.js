module.exports = {
    up: function(migration, DataTypes, done) {
    // add altering commands here, calling 'done' when finished
        migration.createTable(
            'maggs_thankyou_message_models',
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
                    type: DataTypes.STRING,
                    unique: true
                }
            }
        );
        done();
    },
    down: function(migration, DataTypes, done) {
    // add reverting commands here, calling 'done' when finished
        migration.dropTable('maggs_thankyou_message_models', {cascade: true});
        done();
    }
}
