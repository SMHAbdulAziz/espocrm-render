FROM php:8.2-apache

# Enable required PHP extensions
RUN apt-get update && apt-get install -y \
    libpng-dev libjpeg-dev libfreetype6-dev \
    libzip-dev unzip libonig-dev libxml2-dev git curl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_mysql gd zip mbstring

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Set working directory
WORKDIR /var/www/html

# Copy project files
COPY . .

# Set permissions
RUN chown -R www-data:www-data /var/www/html && \
    chmod -R 755 /var/www/html

# Add PlanetScale SSL cert
COPY planetscale-ca.pem /etc/ssl/certs/planetscale-ca.pem

# Create dummy config.php for EspoCRM installer
RUN mkdir -p /var/www/html/data && \
    echo "<?php return array( \
        'database' => array( \
            'driver' => 'pdo_mysql', \
            'host' => 'localhost', \
            'dbname' => 'espocrm', \
            'user' => 'root', \
            'password' => 'password', \
            'charset' => 'utf8mb4' \
        ) \
    );" > /var/www/html/data/config.php

EXPOSE 80
