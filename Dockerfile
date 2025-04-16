FROM php:8.1-apache

# Enable mod_rewrite and required PHP extensions
RUN apt-get update && \
    apt-get install -y unzip && \
    docker-php-ext-install mysqli pdo pdo_mysql && \
    a2enmod rewrite

# Configure Apache for .htaccess support
RUN echo '<Directory /var/www/html/>\n\
    AllowOverride All\n\
</Directory>' >> /etc/apache2/apache2.conf

# Set working directory
WORKDIR /var/www/html

# Download and extract EspoCRM
ADD https://www.espocrm.com/downloads/EspoCRM-7.5.6.zip espocrm.zip
RUN unzip espocrm.zip && rm espocrm.zip && mv EspoCRM*/* . && rm -rf EspoCRM*

# Set correct permissions
RUN chown -R www-data:www-data . && chmod -R 755 .

EXPOSE 80
CMD ["apache2-foreground"]
