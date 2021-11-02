module.exports = function (sequelize, DataTypes) {
    var IpadInteraction = sequelize.define('maggs_ipad_interaction',
        {
            customer_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            store_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            }
        }
    );

    return IpadInteraction;
};
