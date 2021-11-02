module.exports = function (sequelize, DataTypes) {
    var ThankyouMessage = sequelize.define('maggs_thankyou_message',
        {
            message: {
                type: DataTypes.STRING
            },
            scheduled_date: {
                type: DataTypes.DATE
            },
            customer_id: {
                type: DataTypes.INTEGER
            },
            ipad_interaction_id: {
                type: DataTypes.INTEGER
            },
            feedback: {
                type: DataTypes.BOOLEAN
            }
        }
    );

    return ThankyouMessage;
};
