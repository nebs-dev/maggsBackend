module.exports = function (sequelize, DataTypes) {

    var Campaign = sequelize.define('maggs_campaign',
        {
            description: {
                type: DataTypes.STRING(1000)
            },
            //store_ids: {
            //    type: DataTypes.ARRAY(DataTypes.INTEGER)
            //},
            start_date: {
                type: DataTypes.DATE
            },
            end_date: {
                type: DataTypes.DATE
            },
            launch_date: {
                type: DataTypes.DATE
            },
            tagline: {
                type: DataTypes.STRING
            },
            icon: {
                type: DataTypes.STRING
            },
            icon_wide: {
                type: DataTypes.STRING
            },
            value: {
                type: DataTypes.STRING
            }
        },
        {
            instanceMethods: {
                getStatus: function(i18n) {
                    var now = new Date();
                    if (now < this.launch_date) {
                        return i18n('draft');
                    }
                    if (now < this.start_date) {
                        return i18n('published');
                    }
                    if (now >= this.start_date && now <= this.end_date) {
                        return i18n('valid');
                    }
                    return i18n('finished');
                },
                getLabel: function() {
                    var now = new Date();
                    if (now < this.launch_date) {
                        return 'warning';
                    }
                    if (now < this.start_date) {
                        return 'info';
                    }
                    if (now >= this.start_date && now <= this.end_date) {
                        return 'success';
                    }
                    return 'default';
                },
                getTest: function() {
                    var Store = sequelize.import('store');
                    //var models = sequelize.import('index');

                    //var sql = "SELECT * FROM maggs_stores;";

                    Store.findAll({})
                        .then(function(stores) {
                            //console.log(stores);
                            return stores;
                        })
                        .catch(function(err){
                            return false;
                        });

                    //sequelize.query(sql)
                    //    .then(function(stores) {
                    //        //console.log(stores);
                    //        return cb();
                    //    })
                    //    .catch(function(err){
                    //        return false;
                    //    });
                }
            },
            classMethods: {
                associate: function(models) {
                    Campaign.hasMany(models.maggs_store, {through: 'campaign_store', as: 'Stores', foreignKey: 'campaign_id'});
                }
            }
        }
    );

    return Campaign;
};
