module.exports = {
    up: function(migration, DataTypes, done) {
        // add altering commands here, calling 'done' when finished
        migration.addIndex(
            'maggs_beacons',
            ['uuid', 'major', 'minor'],
            {
                indicesType: 'UNIQUE'
            }
        );
        done();
    },
    down: function(migration, DataTypes, done) {
        // add reverting commands here, calling 'done' when finished
        migration.removeIndex(
            'maggs_beacons',
            ['uuid', 'major', 'minor']
        );
        done();
    }
}
