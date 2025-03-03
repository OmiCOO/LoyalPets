# Testing the Asynchronous API

This guide explains how to test the asynchronous message processing in the LoyalPets API.

## Understanding Asynchronous Processing

The assistant message endpoint has been updated to use an asynchronous approach:

1. When you send a message, the API immediately returns a response with a `runId`
2. The message processing continues in the background
3. You can check the status of the processing using the `message-status` endpoint
4. Once processing is complete, you can retrieve the assistant's response

This approach prevents timeouts when dealing with long-running AI operations.

## Testing Flow

### 1. Authentication

First, authenticate to get a token:

1. Use the "Login" or "Signup" endpoint
2. The token will be automatically saved to the `authToken` environment variable

### 2. Create a Pet

If you don't already have a pet:

1. Use the "Create Pet" endpoint
2. Note the pet ID in the response

### 3. Create a Thread

1. Use the "Create New Thread" endpoint with your pet's information
2. The thread ID will be automatically saved to the `threadId` environment variable
3. Update your pet with the thread ID using the "Update Pet Thread ID" endpoint

### 4. Send a Message (Asynchronous)

1. Use the "Send Message (Async)" endpoint
2. Include your pet's information and the message
3. The response will include a `runId` which will be automatically saved to the environment

Example response:
```json
{
  "runId": "run_abc123",
  "status": "in_progress",
  "message": "Your request is being processed. Check the status using the /message-status endpoint."
}
```

### 5. Check Message Status

1. Use the "Check Message Status" endpoint
2. The `runId` and `threadId` will be automatically included from the environment variables
3. Check the `status` field in the response

Possible status values:
- `in_progress`: The message is still being processed
- `completed`: The message processing is complete
- `failed`: The message processing failed

Example response (in progress):
```json
{
  "status": "in_progress",
  "message": "Your request is still being processed."
}
```

Example response (completed):
```json
{
  "status": "completed",
  "response": "Based on your dog's breed and health status, I recommend...",
  "source": "assistant"
}
```

Example response (failed):
```json
{
  "status": "failed",
  "error": "Error message describing what went wrong"
}
```

### 6. Polling for Completion

In a real application, you would poll the status endpoint until the status is `completed` or `failed`:

1. Send the message using the async endpoint
2. Wait a short time (e.g., 2 seconds)
3. Check the status
4. If still in progress, go back to step 2
5. If completed or failed, handle the response accordingly

## Testing with Postman

1. Use the "Send Message (Async)" request
2. Wait a few seconds
3. Use the "Check Message Status" request
4. Repeat step 3 until you get a completed or failed status

## Troubleshooting

### Common Issues

1. **404 Not Found for runId**:
   - The run ID may have expired or been removed from memory
   - Make sure to include the `threadId` query parameter when checking status

2. **Long Processing Times**:
   - AI operations can take time, especially for complex queries
   - Continue polling until you get a final status

3. **Failed Status**:
   - Check the error message for details
   - Common causes include invalid thread IDs or OpenAI API issues

### Testing Locally

If you're testing locally:

1. Change the environment to use `localUrl` instead of `baseUrl`
2. The in-memory storage of run statuses will be cleared if the server restarts
3. For production, consider using a database or Redis to store run statuses 