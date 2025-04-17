FROM php:8.1-apache

# Install required packages and PHP extensions
RUN apt-get update && \
    apt-get install -y unzip libzip-dev zip && \
    docker-php-ext-install mysqli pdo pdo_mysql zip && \
    a2enmod rewrite

# Fix .htaccess handling
RUN echo '<Directory /var/www/html/public/>\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' >> /etc/apache2/apache2.conf

# Set Apache document root to EspoCRM's public folder
RUN sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html/public|' /etc/apache2/sites-available/000-default.conf

# Download and extract EspoCRM
WORKDIR /var/www/html
ADD https://www.espocrm.com/downloads/EspoCRM-7.5.6.zip espocrm.zip

RUN unzip espocrm.zip && \
    rm espocrm.zip && \
    mv EspoCRM*/* . && \
    rm -rf EspoCRM*

# Set permissions
RUN chown -R www-data:www-data /var/www/html && chmod -R 755 /var/www/html

EXPOSE 80
CMD ["apache2-foreground"]
