module.exports = function (sequelize, DataTypes) {
    var AppInfo = sequelize.define('maggs_app_info',
        {
            type: {
                type: DataTypes.STRING
            },
            date: {
                type: DataTypes.DATE,
                allowNull: true
            },
            value: {
                type: DataTypes.STRING,
                allowNull: true
            }
        }
    );

    return AppInfo;
};
