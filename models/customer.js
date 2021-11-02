module.exports = function (sequelize, DataTypes) {
    var Customer = sequelize.define('maggs_customer',
        {
            card_id: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                validate: {
                    len: [19, 19],
                    isNumeric: true
                }
            },
            title: {
                type: DataTypes.STRING
            },
            street: {
                type: DataTypes.STRING
            },
            city: {
                type: DataTypes.STRING
            },
            firstname: {
                type: DataTypes.STRING
            },
            lastname: {
                type: DataTypes.STRING
            },
            birthday: {
                type: DataTypes.DATE
            },
            gold_points: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            hints: {
                type: DataTypes.STRING(5000)
            },
            nickname: {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false
            },
            gender: {
                type: DataTypes.ENUM('female', 'male'),
                allowNull: true
            }
        },
        {
            instanceMethods: {
                getLevel: function (next) {
                    var customer = this;
                    var ContestLevels = sequelize.import('levels');
                    var _ = require('lodash');

                    customer.getContestEntries().then(function (contestData) {
                        var totalLikes = _.reduce(_.pluck(contestData, 'likes'), function (a, b) {
                            return a + b;
                        }, 0);


                        return ContestLevels.findAll({}).then(function (levels) {
                            var currentLevel = {};
                            var currentRequired = false;

                            _.each(levels, function (level) {

                                if (level.required <= totalLikes) {
                                    if (!currentRequired || currentRequired <= level.required) {
                                        currentLevel = {
                                            level: level.level,
                                            title: level.title,
                                            points: level.points,
                                            image: level[customer.gender],
                                            totalLikes: totalLikes,
                                            nickname: customer.nickname,
                                            gender: customer.gender,
                                            card_id: customer.card_id
                                        };
                                        currentRequired = level.required;
                                    }
                                }
                            });

                            return next(currentLevel);


                        })
                    }).catch(function (err) {
                        return next(false);
                    });
                }
            },
            classMethods: {
                associate: function (models) {
                    Customer.hasMany(models.maggs_contest_entry, {foreignKey: 'customer_id', as: 'ContestEntries'});
                    Customer.hasMany(models.maggs_customer_feedback, {
                        foreignKey: 'customer_id',
                        as: 'CustomerFeedbacks'
                    });
                }
            }
        }
    );

    return Customer;
};
