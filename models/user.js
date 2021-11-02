var bcrypt   = require('bcrypt-nodejs');
//var Store = require('./store');

module.exports = function (sequelize, DataTypes) {

    var User = sequelize.define('maggs_user',
        {
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                validate: {
                    isEmail: true
                }
            },
            password: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    min: 4
                }
                //set:  function(v) {
                //    var salt = bcrypt.genSaltSync(10);
                //    var hash = bcrypt.hashSync(v, salt);
                //
                //    this.setDataValue('password', hash);
                //}
            },
            hash: {
                type: DataTypes.STRING
            },
            email_confirmed: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            superadmin: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            }
        },
        {
            classMethods: {
                generateHash: function(password) {
                    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
                },
                associate: function(models) {
                    User.hasMany(models.maggs_store, {through: 'user_store', as: 'Stores', foreignKey: 'user_id'});
                }
            },
            instanceMethods: {
                validatePassword: function(password) {
                    return bcrypt.compareSync(password, this.password);
                }
            }
        }
    );

    return User;
};
