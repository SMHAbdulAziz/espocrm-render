FROM php:8.1-apache

# Enable mod_rewrite and required PHP extensions
RUN apt-get update && \
    apt-get install -y unzip && \
    docker-php-ext-install mysqli pdo pdo_mysql && \
    a2enmod rewrite

# Enable .htaccess and proper directory access
RUN echo '<Directory /var/www/html/public/>\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' >> /etc/apache2/apache2.conf

# Set working directory to public
WORKDIR /var/www/html

# Download EspoCRM and move to /var/www/html
ADD https://www.espocrm.com/downloads/EspoCRM-7.5.6.zip espocrm.zip

RUN unzip espocrm.zip && \
    rm espocrm.zip && \
    mv EspoCRM*/* . && \
    rm -rf EspoCRM*

# Update Apache document root to /public
RUN sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html/public|' /etc/apache2/sites-available/000-default.conf

# Fix permissions
RUN chown -R www-data:www-data . && chmod -R 755 .

EXPOSE 80
CMD ["apache2-foreground"]
