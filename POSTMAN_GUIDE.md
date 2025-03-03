# LoyalPets API Testing Guide

This guide explains how to use the Postman collection to test the LoyalPets API.

## Getting Started

1. Import the collection and environment files into Postman:
   - Open Postman
   - Click "Import" in the top left corner
   - Upload both `LoyalPets_API_Collection.json` and `LoyalPets_Environment.json` files

2. Select the environment:
   - In the top right corner of Postman, select "LoyalPets Environment" from the dropdown

## Testing Flow

Follow this sequence to test the API endpoints:

### 1. Authentication

Start by creating a user account or logging in:

- **Signup**: Creates a new user account
  - The auth token will be automatically saved to the environment

- **Login**: Logs in with existing credentials
  - The auth token will be automatically saved to the environment

### 2. Pet Management

After authentication, you can manage pets:

- **Create Pet**: Add a new pet to your account
  - Note the pet ID in the response for use in other requests

- **Get All Pets**: View all your pets
  - You can use this to find pet IDs if needed

- **Get Pet by ID**: View details of a specific pet
  - Update the `:id` parameter with your pet's ID

### 3. Assistant Interaction

To use the AI assistant:

- **Get Assistant Status**: Check if the assistant is initialized

- **Create New Thread**: Create a new conversation thread for a pet
  - Update the `petId` and `petInfo` in the request body with your pet's details
  - The thread ID will be automatically saved to the environment

- **Update Pet Thread ID**: Associate the thread with your pet
  - Update the `:id` parameter with your pet's ID
  - The thread ID from the previous step will be used automatically

- **Send Message**: Send a message to the assistant
  - Update the `petInfo` in the request body with your pet's details
  - The thread ID from the previous steps will be used automatically

- **Get Chat History**: View the conversation history for a pet
  - Update the `:petId` parameter with your pet's ID

### 4. Feedback

- **Submit Feedback**: Provide feedback about the assistant
  - Update the `pet_id` in the request body with your pet's ID
  - The thread ID from the previous steps will be used automatically

### 5. Admin Endpoints (Admin Only)

These endpoints require admin privileges:

- **Get All Users**: View all registered users
- **Get Platform Statistics**: View usage statistics
- **Get Pet Types Distribution**: View distribution of pet types
- **Get Disease Distribution**: View distribution of diseases

## Important Notes

1. **Authentication**: All endpoints except login and signup require authentication. The token is automatically saved when you login or signup.

2. **Variables**:
   - `{{baseUrl}}`: The base URL of the API (set to the Vercel deployment)
   - `{{authToken}}`: Your authentication token (automatically set after login/signup)
   - `{{threadId}}`: The thread ID for assistant conversations (automatically set after creating a thread)

3. **Local Testing**:
   - If you want to test against a local server, edit the environment and enable the `localUrl` variable instead of `baseUrl`

4. **Request Flow**:
   1. Login/Signup → Get token
   2. Create Pet → Get pet ID
   3. Create Thread → Get thread ID
   4. Update Pet with thread ID
   5. Send messages to assistant
   6. Submit feedback

## Troubleshooting

- **401 Unauthorized**: Your token may have expired. Try logging in again.
- **404 Not Found**: Check that you're using the correct IDs in your requests.
- **500 Server Error**: There may be an issue with the server. Check the error message for details.

If you encounter persistent issues, check the server logs or contact the backend developer. 