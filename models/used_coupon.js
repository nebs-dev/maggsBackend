module.exports = function (sequelize, DataTypes) {

    var UsedCoupon = sequelize.define('maggs_used_coupon',
        {
            customer_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            campaign_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            store_id: {
                type: DataTypes.INTEGER,
                references: 'maggs_stores',
                referencesKey: 'id',
                allowNull: false
            },
            date: {
                type: DataTypes.DATE,
                allowNull: false
            }
        }
    );

    return UsedCoupon;
};
