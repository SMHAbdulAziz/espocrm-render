FROM php:8.1-apache

# Install required PHP extensions and CA certs
RUN apt-get update && \
    apt-get install -y unzip libzip-dev zip libpng-dev libicu-dev ca-certificates && \
    docker-php-ext-install mysqli pdo pdo_mysql zip gd intl && \
    a2enmod rewrite

# Apache config: allow .htaccess and set correct document root
RUN echo '<Directory /var/www/html/public/>\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' >> /etc/apache2/apache2.conf && \
    sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html/public|' /etc/apache2/sites-available/000-default.conf

# Set working dir and clean old content
WORKDIR /var/www/html
RUN rm -rf ./*

# Download and extract EspoCRM directly here
ADD https://www.espocrm.com/downloads/EspoCRM-7.5.6.zip espocrm.zip
RUN unzip espocrm.zip && \
    mv EspoCRM-*/* . && \
    rm -rf espocrm.zip EspoCRM-*

# Fix file permissions
RUN chown -R www-data:www-data /var/www/html && \
    chmod -R 755 /var/www/html

# Add PlanetScale SSL config
COPY my.cnf /etc/mysql/my.cnf

EXPOSE 80
CMD ["apache2-foreground"]
