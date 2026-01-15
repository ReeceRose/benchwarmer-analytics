-- Benchwarmer Analytics Database Initialization
-- This script runs automatically when the PostgreSQL container is first created

-- Create application user
CREATE USER benchwarmer WITH PASSWORD 'benchwarmer';

-- Create main application database
CREATE DATABASE benchwarmer OWNER benchwarmer;

-- Create Hangfire database for background job scheduling
CREATE DATABASE hangfire OWNER benchwarmer;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE benchwarmer TO benchwarmer;
GRANT ALL PRIVILEGES ON DATABASE hangfire TO benchwarmer;

-- Connect to benchwarmer database and set up permissions
\c benchwarmer
GRANT ALL ON SCHEMA public TO benchwarmer;

-- Connect to hangfire database and set up permissions
\c hangfire
GRANT ALL ON SCHEMA public TO benchwarmer;
