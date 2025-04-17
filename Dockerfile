FROM php:8.2-apache

# Enable required PHP extensions
RUN apt-get update && apt-get install -y \
    libpng-dev libjpeg-dev libfreetype6-dev \
    libzip-dev unzip libonig-dev libxml2-dev git curl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_mysql gd zip mbstring xml

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Set document root to public
RUN sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html/public|' /etc/apache2/sites-available/000-default.conf

# Set working directory
WORKDIR /var/www/html/public

# Copy project files
COPY . /var/www/html/public

# Add PlanetScale SSL cert
COPY planetscale-ca.pem /etc/ssl/certs/planetscale-ca.pem

# Create proper .htaccess file
RUN echo 'RewriteEngine On\nRewriteRule ^api/v1/. - [L]\nRewriteRule ^portal/. - [L]\nRewriteRule ^webhooks/. - [L]\nRewriteCond %{REQUEST_FILENAME} !-f\nRewriteCond %{REQUEST_FILENAME} !-d\nRewriteRule ^(.*)$ index.php [L]' > /var/www/html/.htaccess

# Create config.php using a PHP script to avoid escaping issues
RUN mkdir -p /var/www/html/data && \
    echo '<?php \
    $config = ["database" => [ \
        "driver" => "pdo_mysql", \
        "host" => getenv("DB_HOST"), \
        "dbname" => getenv("DB_NAME"), \
        "user" => getenv("DB_USERNAME"), \
        "password" => getenv("DB_PASSWORD"), \
        "charset" => "utf8mb4", \
        "sslCA" => "/etc/ssl/certs/planetscale-ca.pem" \
    ]]; \
    file_put_contents("/var/www/html/data/config.php", "<?php return " . var_export($config, true) . "; ?>"); \
    ' > /tmp/create-config.php && \
    php /tmp/create-config.php && \
    rm /tmp/create-config.php

# Set proper permissions
RUN chown -R www-data:www-data /var/www/html && \
    chmod -R 755 /var/www/html && \
    find /var/www/html -type d -exec chmod 755 {} \; && \
    find /var/www/html -type f -exec chmod 644 {} \;

# Create installation flag if needed
RUN touch /var/www/html/data/installed

# Configure Apache
RUN echo '<Directory /var/www/html>\n\
    Options Indexes FollowSymLinks\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' > /etc/apache2/conf-available/espocrm.conf && \
    a2enconf espocrm

# Expose port for web access
EXPOSE 80

# Set Apache as the entrypoint
CMD ["apache2-foreground"]
