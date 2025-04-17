FROM php:8.1-apache

# Install MySQL and required PHP extensions
RUN apt-get update && \
    apt-get install -y default-mysql-server default-mysql-client unzip libzip-dev zip libpng-dev libicu-dev && \
    docker-php-ext-install mysqli pdo pdo_mysql zip gd intl && \
    a2enmod rewrite

# Configure Apache
RUN { \
    echo '<Directory /var/www/html/>'; \
    echo '    AllowOverride All'; \
    echo '    Require all granted'; \
    echo '</Directory>'; \
} >> /etc/apache2/apache2.conf

# Download and install EspoCRM
WORKDIR /tmp
RUN rm -rf /var/www/html/*
ADD https://www.espocrm.com/downloads/EspoCRM-7.5.6.zip espocrm.zip
RUN unzip espocrm.zip && \
    cp -a EspoCRM-7.5.6/. /var/www/html/ && \
    rm -rf EspoCRM* espocrm.zip

# Set permissions
RUN chown -R www-data:www-data /var/www/html && \
    chmod -R 755 /var/www/html && \
    find /var/www/html -type d -exec chmod 755 {} \; && \
    find /var/www/html -type f -exec chmod 644 {} \;

# Create startup script
RUN echo '#!/bin/bash\n\
mkdir -p /var/run/mysqld\n\
chown -R mysql:mysql /var/run/mysqld\n\
service mariadb start || service mysql start\n\
sleep 5\n\
mysql -e "CREATE DATABASE IF NOT EXISTS espocrm;"\n\
mysql -e "CREATE USER IF NOT EXISTS '"'"'espouser'"'"'@'"'"'localhost'"'"' IDENTIFIED BY '"'"'espopassword'"'"';"\n\
mysql -e "GRANT ALL PRIVILEGES ON espocrm.* TO '"'"'espouser'"'"'@'"'"'localhost'"'"';"\n\
mysql -e "FLUSH PRIVILEGES;"\n\
apache2-foreground\n' > /usr/local/bin/startup.sh && \
    chmod +x /usr/local/bin/startup.sh

EXPOSE 80
COPY my.cnf /etc/mysql/my.cnf
CMD ["/usr/local/bin/startup.sh"]
