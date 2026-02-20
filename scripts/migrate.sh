#!/bin/bash
set -e

echo "Running database migrations..."

# Wait for database to be ready
echo "Waiting for database..."
/usr/local/bin/wait-for-it.sh $DB_HOST:$DB_PORT -t 30

# Run migrations
if [ "$NODE_ENV" = "production" ]; then
    echo "Running production migrations..."
    npm run typeorm:migration:run
else
    echo "Running development migrations..."
    npm run typeorm:migration:run
fi

echo "Migrations completed successfully!"
