module.exports = function (sequelize, DataTypes) {
    var Card = sequelize.define('maggs_card', {
        card_id: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isNumeric: true,
                len: [19,19]
            }
        },
        available: {
            type: DataTypes.BOOLEAN,
            default: true
        }
    });

    return Card;
};
