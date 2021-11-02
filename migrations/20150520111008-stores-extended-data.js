"use strict";

module.exports = {
    up: function (migration, DataTypes, done) {
        // TODO: all these columns should be "allowNull: false", but
        // migration fails if you specify that
        //migration.addColumn('maggs_stores', 'name', { type: DataTypes.STRING });
        migration.addColumn('maggs_stores', 'key', {type: DataTypes.STRING});
        migration.addColumn('maggs_stores', 'secret', {type: DataTypes.STRING});
        migration.addColumn('maggs_stores', 'streetNr', {type: DataTypes.STRING});
        migration.addColumn('maggs_stores', 'postcode', {type: DataTypes.INTEGER});
        migration.addColumn('maggs_stores', 'town', {type: DataTypes.STRING});
        migration.addColumn('maggs_stores', 'phone', {type: DataTypes.STRING});
        migration.addColumn('maggs_stores', 'contactEmail', {type: DataTypes.STRING});
        migration.addColumn('maggs_stores', 'storemanagerEmail', {type: DataTypes.STRING});
        migration.addColumn('maggs_stores', 'lat', {type: DataTypes.DECIMAL(8, 6)});
        migration.addColumn('maggs_stores', 'long', {type: DataTypes.DECIMAL(8, 6)});
        migration.addColumn('maggs_stores', 'photo', {type: DataTypes.STRING});

        done();
    },

    down: function (migration, DataTypes, done) {
        migration.removeColumn('maggs_stores', 'name');
        migration.removeColumn('maggs_stores', 'key');
        migration.removeColumn('maggs_stores', 'streetNr');
        migration.removeColumn('maggs_stores', 'postcode');
        migration.removeColumn('maggs_stores', 'town');
        migration.removeColumn('maggs_stores', 'phone');
        migration.removeColumn('maggs_stores', 'contactEmail');
        migration.removeColumn('maggs_stores', 'storemanagerEmail');
        migration.removeColumn('maggs_stores', 'lat');
        migration.removeColumn('maggs_stores', 'long');
        migration.removeColumn('maggs_stores', 'photo');

        done();
    }
};
