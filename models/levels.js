module.exports = function (sequelize, DataTypes) {
    var ContestLevel = sequelize.define('maggs_contest_level',
        {
            title: {
                type: DataTypes.STRING
            },
            required: {
                type: DataTypes.INTEGER
            },
            points: {
                type: DataTypes.INTEGER
            },
            male: {
                type: DataTypes.STRING
            },
            female: {
                type: DataTypes.STRING
            }
        }
    );

    return ContestLevel;
};
