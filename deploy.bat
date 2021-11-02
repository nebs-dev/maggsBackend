@echo off
cf target -o MaggsApp
cf target -s development
cf push MaggsDev -c "node_modules/sequelize/bin/sequelize -e development -m && node app.js"