module.exports = function (sequelize, DataTypes) {
    var Contest = sequelize.define('maggs_contest',
        {
            hashtag: {
                type: DataTypes.STRING
            },
            icon: {
                type: DataTypes.STRING
            },
            description: {
                type: DataTypes.TEXT
            },
            start_date: {
                type: DataTypes.DATE
            },
            end_date: {
                type: DataTypes.DATE
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
                }
            },
            classMethods: {
                associate: function(models) {
                    Contest.hasMany(models.maggs_contest_entry, {onDelete: 'cascade', hooks: true, foreignKey: 'contest_id', as: 'ContestEntries'});
                }
            }
        }
    );

    return Contest;
};
