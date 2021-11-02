module.exports = function (sequelize, DataTypes) {
    var Beacon = sequelize.define('maggs_beacon',
        {
            store_id: {
                type: DataTypes.INTEGER
            },
            uuid: {
                type: DataTypes.STRING
            },
            name: {
                type: DataTypes.STRING
            },
            major: {
                type: DataTypes.INTEGER,
                validate: {
                    min: 0,
                    max: 65536
                }
            },
            minor: {
                type: DataTypes.INTEGER,
                validate: {
                    min: 0,
                    max: 65536
                }
            },
            cash_register: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            }
        },
        {
            classMethods: {
                associate: function(models) {
                    Beacon.belongsTo(models.maggs_store, {foreignKey: 'store_id', as: 'Store'});
                }
            }
        }
    );

    return Beacon;
};
