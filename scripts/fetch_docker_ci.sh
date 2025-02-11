#!/bin/bash

REPO_URL="https://raw.githubusercontent.com/neonlabsorg/neon-proxy.py/develop/docker-compose/docker-compose-ci.yml"
DESTINATION="./docker-compose-ci.yml"
echo "Fetching latest docker-compose-ci.yml from repository..."
curl -sSfL "$REPO_URL" -o "$DESTINATION"
if [ $? -eq 0 ]; then
    echo "Successfully fetched docker-compose-ci.yml"
else
    echo "Failed to fetch docker-compose-ci.yml"
    exit 1
fi
