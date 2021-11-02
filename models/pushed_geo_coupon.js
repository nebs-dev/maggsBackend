module.exports = function (sequelize, DataTypes) {
    var PushedGeoCoupon = sequelize.define('maggs_pushed_geo_coupon',
        {
            beacon_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            customer_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            geo_campaign_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            redeemed: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            date: {
                type: DataTypes.DATE,
                allowNull: false
            }
        }
    );

    return PushedGeoCoupon;
};
