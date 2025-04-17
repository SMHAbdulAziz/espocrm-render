FROM php:8.1-apache

# Install PHP extensions and CA certs for PlanetScale SSL
RUN apt-get update && \
    apt-get install -y unzip libzip-dev zip libpng-dev libicu-dev ca-certificates && \
    docker-php-ext-install mysqli pdo pdo_mysql zip gd intl && \
    a2enmod rewrite

# Allow .htaccess in public folder
RUN echo '<Directory /var/www/html/public/>\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' >> /etc/apache2/apache2.conf

# Set Apache to use public dir as root
RUN sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html/public|' /etc/apache2/sites-available/000-default.conf

# Download and extract EspoCRM
WORKDIR /tmp
ADD https://www.espocrm.com/downloads/EspoCRM-7.5.6.zip espocrm.zip

RUN unzip espocrm.zip && \
    mv EspoCRM-* /var/www/html && \
    rm espocrm.zip

# Fix permissions
RUN chown -R www-data:www-data /var/www/html && \
    chmod -R 755 /var/www/html

# Add SSL config for PlanetScale
COPY my.cnf /etc/mysql/my.cnf

EXPOSE 80
CMD ["apache2-foreground"]
