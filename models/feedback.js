module.exports = function (sequelize, DataTypes) {
    var Feedback = sequelize.define('maggs_feedback',
        {
            PushText: {
                type: DataTypes.STRING
            },
            Question1: {
                type: DataTypes.STRING
            },
            Question2: {
                type: DataTypes.STRING
            },
            Question1Answers: {
                type: DataTypes.ARRAY(DataTypes.STRING)
            }
        },
        {
            classMethods: {
                associate: function(models) {
                    Feedback.belongsTo(models.maggs_store, {as: 'Store', foreignKey: 'store_id'});
                }
            }
        }
    );

    return Feedback;
};
