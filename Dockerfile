FROM php:8.1-apache

RUN docker-php-ext-install mysqli pdo pdo_mysql && \
    a2enmod rewrite

RUN apt-get update && \
    apt-get install -y unzip && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

ADD https://www.espocrm.com/downloads/EspoCRM-7.5.6.zip espocrm.zip

RUN unzip espocrm.zip && rm espocrm.zip && mv EspoCRM*/* . && rm -rf EspoCRM*

RUN chown -R www-data:www-data . && chmod -R 755 .

EXPOSE 80
