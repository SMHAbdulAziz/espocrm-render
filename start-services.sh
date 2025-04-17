#!/bin/bash

# Start MySQL
service mysql start

# Create database
mysql -e "CREATE DATABASE IF NOT EXISTS espocrm;"
mysql -e "CREATE USER IF NOT EXISTS 'espouser'@'localhost' IDENTIFIED BY 'espopassword';"
mysql -e "GRANT ALL PRIVILEGES ON espocrm.* TO 'espouser'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# Start Apache
apache2-foreground
