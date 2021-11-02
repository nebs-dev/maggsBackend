module.exports = function (sequelize, DataTypes) {
    var ContestEntry = sequelize.define('maggs_contest_entry',
        {
            contest_id: {
                type: DataTypes.INTEGER
            },
            customer_id: {
                type: DataTypes.INTEGER
            },
            photo: {
                type: DataTypes.STRING
            },
            description: {
                type: DataTypes.TEXT
            },
            votes: {
                type: DataTypes.ARRAY(DataTypes.INTEGER)
            },
            likes: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            reports: {
                type: DataTypes.ARRAY(DataTypes.INTEGER)
            },
            report_count: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            }
        },
        {
            classMethods: {
                associate: function (models) {
                    ContestEntry.belongsTo(models.maggs_contest, {as: 'Contest', foreignKey: 'contest_id'});
                    ContestEntry.belongsTo(models.maggs_customer, {as: 'Customer', foreignKey: 'customer_id'});
                }
            },
            hooks: {
                beforeDestroy: function(entry, fn) {
                    var fs = require('fs');

                    try {
                        fs.unlinkSync(__dirname + '/../public' + entry.photo);
                    } catch (err) {
                        console.log(err);
                    }

                    fn();
                },
            }
        }
    );

    return ContestEntry;
};
