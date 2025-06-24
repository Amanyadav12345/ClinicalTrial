#!/bin/sh

echo "Installing dependencies..."
npm install

echo "Starting the server..."
node backend/server.js
