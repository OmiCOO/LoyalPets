#!/bin/bash

# LoyalPets Vercel Deployment Script

echo "LoyalPets Vercel Deployment Script"
echo "=================================="
echo

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI is not installed. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
echo "Checking Vercel login status..."
vercel whoami &> /dev/null
if [ $? -ne 0 ]; then
    echo "You are not logged in to Vercel. Please login:"
    vercel login
fi

# Prompt for environment variables
echo
echo "Setting up environment variables for deployment..."
echo

# Read environment variables from .env file if it exists
if [ -f .env ]; then
    echo "Found .env file. Using values from it as defaults."
    source .env
fi

# Database URL
read -p "PostgreSQL Database URL [$DATABASE_URL]: " input_db_url
DATABASE_URL=${input_db_url:-$DATABASE_URL}

# JWT Secret
read -p "JWT Secret [$JWT_SECRET]: " input_jwt_secret
JWT_SECRET=${input_jwt_secret:-$JWT_SECRET}

# OpenAI API Key
read -p "OpenAI API Key [$OPENAI_API_KEY]: " input_openai_key
OPENAI_API_KEY=${input_openai_key:-$OPENAI_API_KEY}

# OpenAI Org ID
read -p "OpenAI Organization ID [$OPENAI_ORG_ID]: " input_openai_org
OPENAI_ORG_ID=${input_openai_org:-$OPENAI_ORG_ID}

# Tavily API Key
read -p "Tavily API Key [$TAVILY_API_KEY]: " input_tavily_key
TAVILY_API_KEY=${input_tavily_key:-$TAVILY_API_KEY}

# Create temporary .env.vercel file
echo "Creating temporary environment file for Vercel..."
cat > .env.vercel << EOL
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}
OPENAI_API_KEY=${OPENAI_API_KEY}
OPENAI_ORG_ID=${OPENAI_ORG_ID}
TAVILY_API_KEY=${TAVILY_API_KEY}
NODE_ENV=production
EOL

# Deploy to Vercel with environment variables
echo
echo "Deploying to Vercel..."
vercel --env-file .env.vercel

# Clean up
echo "Cleaning up..."
rm .env.vercel

echo
echo "Deployment process completed!"
echo "Note: You can find your deployment URL in the Vercel dashboard."
echo "Remember to update the Postman environment with your new deployment URL." 