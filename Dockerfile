FROM php:8.1-apache

RUN apt-get update && \
    apt-get install -y unzip libzip-dev zip libpng-dev libicu-dev ca-certificates && \
    docker-php-ext-install mysqli pdo pdo_mysql zip gd intl && \
    a2enmod rewrite

# Setup .htaccess access
RUN echo '<Directory /var/www/html/>\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' >> /etc/apache2/apache2.conf

# Get EspoCRM
WORKDIR /var/www/html
RUN rm -rf ./*
ADD https://www.espocrm.com/downloads/EspoCRM-7.5.6.zip espocrm.zip
RUN unzip espocrm.zip && mv EspoCRM-*/* . && rm -rf espocrm.zip EspoCRM-*

# Set permissions
RUN chown -R www-data:www-data /var/www/html && chmod -R 755 /var/www/html

# Inject PlanetScale client-side SSL configuration
COPY my.cnf /etc/mysql/my.cnf

EXPOSE 80
CMD ["apache2-foreground"]
