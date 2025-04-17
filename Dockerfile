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

# Create config.php using secrets passed from environment
RUN mkdir -p /var/www/html/data && \
    echo "<?php return [" > /var/www/html/data/config.php && \
    echo "  \"database\" => [" >> /var/www/html/data/config.php && \
    echo "    \"driver\" => \"pdo_mysql\"," >> /var/www/html/data/config.php && \
    echo "    \"host\" => getenv('DB_HOST')," >> /var/www/html/data/config.php && \
    echo "    \"dbname\" => getenv('DB_NAME')," >> /var/www/html/data/config.php && \
    echo "    \"user\" => getenv('DB_USER')," >> /var/www/html/data/config.php && \
    echo "    \"password\" => getenv('DB_PASSWORD')," >> /var/www/html/data/config.php && \
    echo "    \"charset\" => \"utf8mb4\"," >> /var/www/html/data/config.php && \
    echo "  ]" >> /var/www/html/data/config.php && \
    echo "];" >> /var/www/html/data/config.php
    
EXPOSE 80
