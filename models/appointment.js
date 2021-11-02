module.exports = function (sequelize, DataTypes) {

    var Appointment = sequelize.define('maggs_appointment',
        {
            date: {
                type: DataTypes.DATE,
                allowNull: false
            },
            time: {
                type: DataTypes.ARRAY(DataTypes.ARRAY(DataTypes.STRING))
            }
        },
        {
            classMethods: {
                associate: function(models) {
                    Appointment.belongsTo(models.maggs_store, {as: 'Store', foreignKey: 'store_id'});
                }
            }
        }
    );

    return Appointment;
};