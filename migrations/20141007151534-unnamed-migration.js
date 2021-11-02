"use strict";

module.exports = {
    up: function (migration, DataTypes, done) {
        // add altering commands here, calling 'done' when finished
        migration.createTable(
            'maggs_users',
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                createdAt: {
                    type: DataTypes.DATE
                },
                updatedAt: {
                    type: DataTypes.DATE
                },
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
            }
        );

        // todo check this and see if customer.js model is the same
        migration.createTable(
            'maggs_customers',
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                createdAt: {
                    type: DataTypes.DATE
                },
                updatedAt: {
                    type: DataTypes.DATE
                },
                card_id: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    unique: true,
                    validate: {
                        len: [19, 19],
                        isNumeric: true
                    }
                },
                title: {
                    type: DataTypes.STRING
                },
                street: {
                    type: DataTypes.STRING
                },
                city: {
                    type: DataTypes.STRING
                },
                firstname: {
                    type: DataTypes.STRING
                },
                lastname: {
                    type: DataTypes.STRING
                },
                birthday: {
                    type: DataTypes.DATE
                },
                gold_points: {
                    type: DataTypes.INTEGER,
                    defaultValue: 1
                },
                nickname: {
                    type: DataTypes.STRING,
                    unique: true,
                    allowNull: false
                },
                gender: {
                    type: DataTypes.ENUM,
                    values: ['female', 'male'],
                    allowNull: false
                }
            }
        );

        migration.createTable(
            'maggs_cards',
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                cardId: {
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
                },
                createdAt: {
                    type: DataTypes.DATE
                },
                updatedAt: {
                    type: DataTypes.DATE
                },
            }
        );

        migration.createTable(
            'maggs_app_infoes',
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                type: {
                    type: DataTypes.STRING,
                },
                value: {
                    type: DataTypes.STRING,
                },
                createdAt: {
                    type: DataTypes.DATE
                },
                updatedAt: {
                    type: DataTypes.DATE
                },
            }
        );

        migration.createTable(
            'maggs_stores',
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                createdAt: {
                    type: DataTypes.DATE
                },
                updatedAt: {
                    type: DataTypes.DATE
                },
                name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    unique: true
                }
            }
        );

        migration.createTable(
            'maggs_appointments',
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                date: {
                    type: DataTypes.DATE
                },
                time: {
                    type: DataTypes.ARRAY(DataTypes.ARRAY(DataTypes.STRING))
                },
                store_id: {
                    type: DataTypes.INTEGER,
                    references: 'maggs_stores',
                    referencesKey: 'id',
                    allowNull: false
                },
                createdAt: {
                    type: DataTypes.DATE
                },
                updatedAt: {
                    type: DataTypes.DATE
                }
            }
        );

        migration.createTable(
            'maggs_contests',
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                hashtag: {
                    type: DataTypes.STRING
                },
                icon: {
                    type: DataTypes.STRING,
                    allowNull: false
                },
                description: {
                    type: DataTypes.TEXT,
                },
                start_date: {
                    type: DataTypes.DATE
                },
                end_date: {
                    type: DataTypes.DATE
                },
                createdAt: {
                    type: DataTypes.DATE
                },
                updatedAt: {
                    type: DataTypes.DATE
                }
            }
        );

        migration.createTable(
            'maggs_contest_levels',
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
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
                },
                createdAt: {
                    type: DataTypes.DATE
                },
                updatedAt: {
                    type: DataTypes.DATE
                }
            }
        );

        migration.createTable(
            'maggs_contest_entries',
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                contest_id: {
                    type: DataTypes.INTEGER,
                    references: 'maggs_contests',
                    referencesKey: 'id',
                    allowNull: false
                },
                customer_id: {
                    type: DataTypes.INTEGER,
                    references: 'maggs_customers',
                    referencesKey: 'id',
                    allowNull: false
                },
                photo: {
                    type: DataTypes.STRING
                },
                description: {
                    type: DataTypes.TEXT
                },
                votes: {
                    type: DataTypes.ARRAY(DataTypes.INTEGER)
                },
                likes: {
                    type: DataTypes.INTEGER
                },
                reports: {
                    type: DataTypes.ARRAY(DataTypes.INTEGER)
                },
                report_count: {
                    type: DataTypes.INTEGER,
                    defaultValue: 0
                },
                createdAt: {
                    type: DataTypes.DATE
                },
                updatedAt: {
                    type: DataTypes.DATE
                }
            }
        );


        migration.createTable(
            'maggs_campaigns',
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                createdAt: {
                    type: DataTypes.DATE
                },
                updatedAt: {
                    type: DataTypes.DATE
                },
                description: {
                    type: DataTypes.STRING(1000),
                    allowNull: false
                },
                //store_ids: {
                //    type: DataTypes.ARRAY(DataTypes.INTEGER),
                //    allowNull: false
                //},
                start_date: {
                    type: DataTypes.DATE,
                    allowNull: false
                },
                end_date: {
                    type: DataTypes.DATE,
                    allowNull: false
                },
                launch_date: {
                    type: DataTypes.DATE,
                    allowNull: false
                },
                tagline: {
                    type: DataTypes.STRING,
                    allowNull: false
                },
                icon: {
                    type: DataTypes.STRING,
                    allowNull: false
                },
                icon_wide: {
                    type: DataTypes.STRING,
                    allowNull: false
                },
                value: {
                    type: DataTypes.STRING,
                    allowNull: false
                }
            }
        );

        migration.createTable(
            'maggs_used_coupons',
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                createdAt: {
                    type: DataTypes.DATE
                },
                updatedAt: {
                    type: DataTypes.DATE
                },
                customer_id: {
                    type: DataTypes.INTEGER,
                    references: 'maggs_customers',
                    referencesKey: 'id',
                    allowNull: false
                },
                campaign_id: {
                    type: DataTypes.INTEGER,
                    references: 'maggs_campaigns',
                    referencesKey: 'id',
                    allowNull: false
                },
                store_id: {
                    type: DataTypes.INTEGER,
                    references: 'maggs_stores',
                    referencesKey: 'id',
                    allowNull: false
                },
                date: {
                    type: DataTypes.DATE,
                    allowNull: false
                }
            }
        );

        migration.createTable(
            'maggs_beacons',
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                createdAt: {
                    type: DataTypes.DATE
                },
                updatedAt: {
                    type: DataTypes.DATE
                },
                uuid: {
                    type: DataTypes.STRING
                },
                name: {
                    type: DataTypes.STRING
                },
                major: {
                    type: DataTypes.INTEGER,
                    validate: {
                        min: 0,
                        max: 65536
                    }
                },
                minor: {
                    type: DataTypes.INTEGER,
                    validate: {
                        min: 0,
                        max: 65536
                    }
                },
                store_id: {
                    type: DataTypes.INTEGER,
                    references: 'maggs_stores',
                    referencesKey: 'id',
                    allowNull: false
                },
                cash_register: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: false
                }
            }
        );

        migration.createTable(
            'maggs_geo_campaigns',
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                createdAt: {
                    type: DataTypes.DATE
                },
                updatedAt: {
                    type: DataTypes.DATE
                },
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
                    type: DataTypes.ARRAY(DataTypes.INTEGER),
                    allowNull: false
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
            }
        );

        migration.createTable(
            'maggs_pushed_geo_coupons',
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                createdAt: {
                    type: DataTypes.DATE
                },
                updatedAt: {
                    type: DataTypes.DATE
                },
                beacon_id: {
                    type: DataTypes.INTEGER,
                    references: 'maggs_beacons',
                    referencesKey: 'id',
                    allowNull: false
                },
                customer_id: {
                    type: DataTypes.INTEGER,
                    references: 'maggs_customers',
                    referencesKey: 'id',
                    allowNull: false
                },
                geo_campaign_id: {
                    type: DataTypes.INTEGER,
                    references: 'maggs_geo_campaigns',
                    referencesKey: 'id',
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

        migration.createTable(
            'maggs_customer_feedbacks',
            {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                customer_id: {
                    type: DataTypes.INTEGER,
                    references: 'maggs_customers',
                    referencesKey: 'id',
                    allowNull: false
                },
                store_id: {
                    type: DataTypes.INTEGER,
                    references: 'maggs_stores',
                    referencesKey: 'id',
                    allowNull: false
                },
                rating: {
                    type: DataTypes.ENUM,
                    values: ['1', '2', '3', '4', '5'],
                    allowNull: false
                },
                claim: {
                    type: DataTypes.ENUM,
                    values: ['waitingtime', 'service', 'offers', 'others'],
                    allowNull: false
                },
                comment: {
                    type: DataTypes.TEXT
                },
                anonymous: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true
                },
                createdAt: {
                    type: DataTypes.DATE
                },
                updatedAt: {
                    type: DataTypes.DATE
                }
            }
        );

        done();
    },

    down: function (migration, DataTypes, done) {
        // add reverting commands here, calling 'done' when finished
        migration.dropTable('maggs_users', {cascade: true});
        migration.dropTable('maggs_customers', {cascade: true});
        migration.dropTable('maggs_campaigns', {cascade: true});
        migration.dropTable('maggs_used_coupons', {cascade: true});
        migration.dropTable('maggs_cards', {cascade: true});
        migration.dropTable('maggs_stores', {cascade: true});
        migration.dropTable('maggs_appointments', {cascade: true});
        migration.dropTable('maggs_contests', {cascade: true});
        migration.dropTable('maggs_contest_entries', {cascade: true});
        migration.dropTable('maggs_beacons', {cascade: true});
        migration.dropTable('maggs_geo_campaigns', {cascade: true});
        migration.dropTable('maggs_pushed_geo_coupons', {cascade: true});
        done();
    }
};
