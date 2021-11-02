@echo off
:: Runs the specified script after settings the Maggs Backend environment variables
call setenv.bat
node %*
