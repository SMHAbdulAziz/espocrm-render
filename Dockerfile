FROM php:8.1-apache

# Install required packages and PHP extensions
RUN apt-get update && \
    apt-get install -y unzip libzip-dev zip libpng-dev libicu-dev && \
    docker-php-ext-install mysqli pdo pdo_mysql zip gd intl && \
    a2enmod rewrite

# Configure Apache properly
RUN sed -i 's/DocumentRoot \/var\/www\/html/DocumentRoot \/var\/www\/html/' /etc/apache2/sites-available/000-default.conf

# Enable .htaccess files
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

# Set proper permissions
RUN chown -R www-data:www-data /var/www/html && \
    chmod -R 755 /var/www/html && \
    find /var/www/html -type d -exec chmod 755 {} \; && \
    find /var/www/html -type f -exec chmod 644 {} \;

EXPOSE 80
CMD ["apache2-foreground"]
