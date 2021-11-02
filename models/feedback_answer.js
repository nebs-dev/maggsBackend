module.exports = function (sequelize, DataTypes) {
    var FeedbackAnswer = sequelize.define('maggs_feedback_answer',
        {
            FeedbackId: {
                type: DataTypes.INTEGER
            },
            Answer1: {
                type: DataTypes.STRING
            },
            Answer2: {
                type: DataTypes.STRING
            }
        }
    );

    return FeedbackAnswer;
};
