# LoyalPets Deployment Guide

This guide provides instructions for deploying the LoyalPets backend to Vercel and using the Postman collection to test the API.

## Deploying to Vercel

### Prerequisites

1. [Vercel account](https://vercel.com/signup)
2. [Vercel CLI](https://vercel.com/docs/cli) (optional, but recommended)
3. [Node.js](https://nodejs.org/) installed on your local machine
4. [Git](https://git-scm.com/) installed on your local machine

### Deployment Steps

#### Option 1: Using Vercel CLI (Recommended)

1. Install Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Navigate to your project directory:
   ```bash
   cd /path/to/loyalpets
   ```

4. Deploy to Vercel:
   ```bash
   vercel
   ```

5. Follow the prompts to configure your deployment. When asked about the build settings, use the defaults as they are already configured in your `vercel.json` file.

6. Once deployed, Vercel will provide you with a URL for your application.

#### Option 2: Using Vercel Dashboard

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket).

2. Log in to your [Vercel Dashboard](https://vercel.com/dashboard).

3. Click on "New Project".

4. Import your Git repository.

5. Configure your project:
   - Framework Preset: Other
   - Build Command: Leave as default (it will use the `vercel-build` script from package.json)
   - Output Directory: Leave as default
   - Environment Variables: Add all the environment variables from your `.env` file (see below)

6. Click "Deploy".

### Environment Variables

You need to set up the following environment variables in your Vercel project:

- `DATABASE_URL`: Your PostgreSQL database connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `OPENAI_API_KEY`: Your OpenAI API key
- `OPENAI_ORG_ID`: Your OpenAI organization ID
- `TAVILY_API_KEY`: Your Tavily API key
- `NODE_ENV`: Set to `production`

To add these in the Vercel dashboard:
1. Go to your project settings
2. Navigate to the "Environment Variables" tab
3. Add each variable with its corresponding value

### Database Setup

This project uses PostgreSQL. You need to:

1. Set up a PostgreSQL database (you can use services like [Supabase](https://supabase.com/), [Neon](https://neon.tech/), or [ElephantSQL](https://www.elephantsql.com/))
2. Update your `DATABASE_URL` environment variable with the connection string
3. The migrations will run automatically during deployment thanks to the `vercel-build` script in package.json

## Using the Postman Collection

### Importing the Collection and Environment

1. Open Postman
2. Click on "Import" in the top left
3. Upload both `LoyalPets_API_Collection.json` and `LoyalPets_Environment.json` files
4. The collection and environment will be imported into Postman

### Configuring the Environment

1. In Postman, click on the environment dropdown in the top right corner
2. Select "LoyalPets Environment"
3. Click on the "eye" icon to view the environment variables
4. Update the `prodUrl` variable with your Vercel deployment URL
5. Click "Update" to save changes

### Using the Collection

1. To use the deployed API, make sure to:
   - Select "LoyalPets Environment" from the environment dropdown
   - Edit the environment and set `baseUrl` to your Vercel deployment URL (or enable the `prodUrl` variable and disable the `baseUrl` variable)

2. Start by using the "Login" or "Signup" request to get an authentication token
3. The token will be automatically saved to the `authToken` environment variable if you add this script to the "Tests" tab of your login/signup request:
   ```javascript
   var jsonData = JSON.parse(responseBody);
   if (jsonData.token) {
       pm.environment.set("authToken", jsonData.token);
   }
   ```

4. Now you can use all the other endpoints that require authentication

## Troubleshooting

### Common Issues

1. **Database Connection Issues**:
   - Verify your `DATABASE_URL` is correct
   - Ensure your database allows connections from Vercel's IP addresses
   - Check if you need to enable SSL for your database connection

2. **Missing Environment Variables**:
   - Double-check that all required environment variables are set in Vercel

3. **Migration Errors**:
   - If migrations fail, you can run them manually using the Vercel CLI:
     ```bash
     vercel env pull .env.local
     npm run migrate:up
     ```

4. **CORS Issues**:
   - If you're getting CORS errors when calling the API from a frontend, check your CORS configuration in `app.js`

### Getting Help

If you encounter issues not covered here, check:
- Vercel documentation: https://vercel.com/docs
- Vercel support: https://vercel.com/support
- PostgreSQL documentation: https://www.postgresql.org/docs/ 