module.exports = function (sequelize, DataTypes) {

    var CustomerFeedback = sequelize.define('maggs_customer_feedback',
        {
            customer_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            store_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            rating: {
                type: DataTypes.ENUM('1','2','3','4','5'),
                allowNull: false
            },
            claim: {
                type: DataTypes.ENUM('waitingtime', 'service', 'offers', 'others'),
                allowNull: false
            },
            comment: {
                type: DataTypes.TEXT
            },
            anonymous: {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            }
        },
        {
            classMethods: {
                associate: function(models) {
                    CustomerFeedback.belongsTo(models.maggs_customer, {as: 'Customer', foreignKey: 'customer_id'});
                    CustomerFeedback.belongsTo(models.maggs_store, {as: 'Store', foreignKey: 'store_id'});
                }
            }
        }
    );

    return CustomerFeedback;
};