module.exports = function (sequelize, DataTypes) {
    var ThankyouMessageModel = sequelize.define('maggs_thankyou_message_model',
        {
            message: {
                type: DataTypes.STRING,
                unique: true
            }
        }
    );

    return ThankyouMessageModel;
};
