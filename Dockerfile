FROM php:8.1-apache

# Install required packages and PHP extensions
RUN apt-get update && \
    apt-get install -y unzip libzip-dev zip libpng-dev libicu-dev ca-certificates && \
    docker-php-ext-install mysqli pdo pdo_mysql zip gd intl && \
    a2enmod rewrite

# Configure Apache to allow .htaccess overrides
RUN echo '<Directory /var/www/html/public/>\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' >> /etc/apache2/apache2.conf

# Update Apache document root to /public
RUN sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html/public|' /etc/apache2/sites-available/000-default.conf

# Download and install EspoCRM
WORKDIR /tmp
RUN rm -rf /var/www/html/*
ADD https://www.espocrm.com/downloads/EspoCRM-7.5.6.zip espocrm.zip
RUN unzip espocrm.zip && \
    cp -a EspoCRM-7.5.6/. /var/www/html/ && \
    rm -rf EspoCRM* espocrm.zip

# Set correct permissions
RUN chown -R www-data:www-data /var/www/html && \
    chmod -R 755 /var/www/html

# Add PlanetScale-compatible SSL config
COPY my.cnf /etc/mysql/my.cnf

EXPOSE 80
CMD ["apache2-foreground"]
