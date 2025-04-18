<?php

return [
    'database' => [
        'driver' => 'pdo_mysql',
        'host' => getenv('DB_HOST') ?: 'aws.connect.psdb.cloud',
        'dbname' => getenv('DB_NAME') ?: 'espocrm',
        'user' => getenv('DB_USERNAME') ?: 'your_planetscale_user',
        'password' => getenv('DB_PASSWORD') ?: 'your_planetscale_password',
        'charset' => 'utf8mb4',
        'options' => [
            PDO::MYSQL_ATTR_SSL_CA => '/etc/ssl/certs/planetscale-ca.pem',
        ]
    ]
];
