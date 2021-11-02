@echo off
echo DEPLOY-PROD IS PROHIBITED ON THE "DEV" BRANCH!
exit /b
cf target -o MaggsApp
cf target -s production
cf push maggspilot -c "node_modules/sequelize/bin/sequelize -e production -m && node app.js"