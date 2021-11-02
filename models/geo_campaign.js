module.exports = function (sequelize, DataTypes) {
    var GeoCampaign = sequelize.define('maggs_geo_campaign',
        {
            description: {
                type: DataTypes.STRING(1000)
            },
            start_date: {
                type: DataTypes.DATE
            },
            end_date: {
                type: DataTypes.DATE
            },
            beacon_ids: {
                type: DataTypes.ARRAY(DataTypes.INTEGER)
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
                    if (now < this.start_date) {
                        return i18n('draft');
                    }
                    if (now >= this.start_date && now <= this.end_date) {
                        return i18n('valid');
                    }
                    return i18n('finished');
                },
                getLabel: function() {
                    var now = new Date();
                    if (now < this.start_date) {
                        return 'warning';
                    }
                    if (now >= this.start_date && now <= this.end_date) {
                        return 'success';
                    }
                    return 'default';
                }
            }
        }
    );

    return GeoCampaign;
};
