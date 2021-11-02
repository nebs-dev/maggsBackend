module.exports = function (sequelize, DataTypes) {

    var Store = sequelize.define('maggs_store',
        {
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            key: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            secret: {
                type: DataTypes.STRING,
                allowNull: false
            },
            streetNr: {
                type: DataTypes.STRING,
                allowNull: false
            },
            postcode: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    len: [4, 4]
                }
            },
            town: {
                type: DataTypes.STRING,
                allowNull: false
            },
            phone: {
                type: DataTypes.STRING,
                validate: {},
                allowNull: false
            },
            contactEmail: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    isEmail: true
                }
            },
            storemanagerEmail: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    isEmail: true
                }
            },
            lat: {
                type: DataTypes.DECIMAL(8, 6)
            },
            long: {
                type: DataTypes.DECIMAL(8, 6)
            },
            photo: {
                type: DataTypes.STRING
            }
        },
        {
            classMethods: {
                associate: function (models) {
                    Store.hasMany(models.maggs_user, {through: 'user_store', as: 'Users', foreignKey: 'store_id'});
                    Store.hasMany(models.maggs_campaign, {
                        through: 'campaign_store',
                        as: 'Campaigns',
                        foreignKey: 'store_id'
                    });
                    Store.hasMany(models.maggs_beacon, {as: 'Beacons', foreignKey: 'store_id'});
                    Store.hasMany(models.maggs_feedback, {as: 'Feadbacks', foreignKey: 'store_id'});
                    Store.hasMany(models.maggs_customer_feedback, {as: 'CustomerFeedbacks', foreignKey: 'store_id'});
                    Store.hasMany(models.maggs_appointment, {
                        as: 'Appointments',
                        foreignKey: 'store_id'
                    });
                }
            }
        }
    );

    return Store;
};
