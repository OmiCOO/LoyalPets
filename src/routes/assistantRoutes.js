const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { tavily } = require('@tavily/core');
const pool = require('../config/database');

// Add this array of uncertainty indicators
const uncertaintyIndicators = [
  "I'm not sure",
  "I don't know",
  'I cannot provide',
  "I'm unable to",
  "I don't have enough information",
  'I cannot say for certain',
  "It's unclear",
  "I'm not qualified",
  'I cannot make a diagnosis',
  'You should consult a veterinarian',
  'I recommend searching',
  "I don't have real-time access",
  'recommend contacting',
  'searching online',
  'find a qualified',
  'contact a local',
  'directories provided by',
];

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

// Log API key presence
console.log('Tavily API Key present:', !!process.env.TAVILY_API_KEY);

// Initialize Tavily client with error handling
let tvly;
try {
  tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
  console.log('Tavily client initialized successfully');
} catch (error) {
  console.error('Error initializing Tavily client:', error);
}

console.log('OpenAI API Key present:', !!process.env.OPENAI_API_KEY);

let assistant;

// Add at the top of the file, after OpenAI initialization
// async function verifyAccount() {
//     try {
//         const subscription = await openai.organizations.list();
//         console.log('Using OpenAI Account:', {
//             organization: subscription.data[0]?.name,
//             id: subscription.data[0]?.id
//         });
//     } catch (error) {
//         console.error('Error verifying account:', error);
//     }
// }

// Initialize assistant
async function initializeAssistant() {
  try {
    console.log('Starting assistant initialization...');

    // First check if we have a valid API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    // Verify account
    // await verifyAccount();

    // Test the OpenAI connection
    try {
      const models = await openai.models.list();
      console.log(
        'OpenAI connection successful. Available models:',
        models.data.map((m) => m.id).join(', ')
      );
    } catch (error) {
      console.error('Failed to connect to OpenAI:', error);
      throw new Error('Failed to connect to OpenAI API');
    }

    // Create the assistant
    console.log('Creating assistant...');
    assistant = await openai.beta.assistants.create({
      name: 'Pet Health Assistant',
      instructions: `You are a pet health assistant. Your role is to provide helpful advice about pet health care. 
                          When responding, consider the pet's information that will be provided in each conversation.
                          Always be clear, professional, and focused on pet health-related matters.`,
      model: 'gpt-3.5-turbo',
    });

    console.log('Assistant created successfully:', assistant.id);

    // Verify the assistant was created by retrieving it
    const retrievedAssistant = await openai.beta.assistants.retrieve(
      assistant.id
    );
    console.log('Assistant verified:', retrievedAssistant.id);

    return assistant;
  } catch (error) {
    console.error('Error in initializeAssistant:', error);
    throw error;
  }
}

// Modify the initialization to wait for completion
(async () => {
  try {
    console.log('Starting server initialization...');
    await initializeAssistant();
    console.log('Server initialization complete');
  } catch (error) {
    console.error('Failed to initialize server:', error);
  }
})();

// Add a status endpoint
router.get('/status', async (req, res) => {
  res.json({
    assistantInitialized: !!assistant,
    assistantId: assistant?.id || null,
  });
});

// Add a test endpoint to verify assistant functionality
router.get('/test', async (req, res) => {
  try {
    if (!assistant) {
      throw new Error('Assistant not initialized');
    }

    // Create a test thread
    const thread = await openai.beta.threads.create();
    console.log('Test thread created:', thread.id);

    // Add a test message
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: "Hello, can you confirm you're working?",
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
    });

    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    let attempts = 0;
    const maxAttempts = 30;

    while (runStatus.status !== 'completed' && attempts < maxAttempts) {
      console.log('Test run status:', runStatus.status);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
    }

    // Get the response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const response = messages.data[0].content[0].text.value;

    res.json({
      success: true,
      assistant_id: assistant.id,
      thread_id: thread.id,
      response: response,
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.toString(),
    });
  }
});

// Create a new thread
router.post('/thread', async (req, res) => {
  try {
    const { petId, petInfo } = req.body;
    console.log('Thread creation request:', { petId, petInfo });

    const needsHealthUpdate = await needsUpdate(petId);
    console.log('Needs health update?', needsHealthUpdate);

    const thread = await openai.beta.threads.create();
    console.log('Thread created:', thread.id);

    // Add initial message based on update status
    let initialMessage;
    if (needsHealthUpdate && petInfo) {
      console.log('Requesting health update for pet:', petInfo.name);
      initialMessage = await getHealthUpdate(thread.id, petInfo);
    } else {
      console.log('Using standard initial message');
      initialMessage = "Hello, I need help with my pet's health.";
    }

    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: initialMessage,
    });

    console.log('Sending thread response:', {
      threadId: thread.id,
      needsUpdate: needsHealthUpdate,
      initialMessage,
    });

    res.json({
      threadId: thread.id,
      needsUpdate: needsHealthUpdate,
      initialMessage: initialMessage,
    });
  } catch (error) {
    console.error('Thread creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this function to perform Tavily search
async function searchTavily(query, petInfo) {
  try {
    console.log('Starting Tavily search with client:', !!tvly);

    const response = await tvly.search(query, {
      search_depth: 'advanced',
      include_answer: true,
      max_results: 5, // Increased to get more results after filtering
      exclude_domains: [
        'quora.com',
        'facebook.com',
        'twitter.com',
        'reddit.com',
        'instagram.com',
        'tiktok.com',
      ],
      include_domains: [
        'petmd.com',
        'vcahospitals.com',
        'merckvetmanual.com',
        'aaha.org',
        'avma.org',
        'vet.cornell.edu',
        'vetmed.ucdavis.edu',
      ],
    });

    console.log('Raw Tavily response:', response);

    if (!response || !response.results || response.results.length === 0) {
      return [];
    }

    // Process results through OpenAI to extract relevant information
    const context = `Given the following search results about ${petInfo.type} health, 
                        specifically regarding ${petInfo.disease} with symptoms: ${petInfo.symptoms}, 
                        please extract and summarize the most relevant medical information. 
                        Focus on treatment options, care instructions, and important medical facts.
                        Exclude any general or non-medical content.`;

    const searchContent = response.results
      .map((r) => `Source: ${r.title}\n${r.content}`)
      .join('\n\n');

    const messages = [
      { role: 'system', content: context },
      { role: 'user', content: searchContent },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.3, // Lower temperature for more focused responses
    });

    const processedContent = completion.choices[0].message.content;

    // Return processed results
    return [
      {
        title: 'Veterinary Information Summary',
        content: processedContent,
        url: response.results[0].url, // Keep primary source for reference
        sources: response.results.map((r) => ({
          title: r.title,
          url: r.url,
        })),
      },
    ];
  } catch (error) {
    console.error('Error in searchTavily:', error);
    return [];
  }
}

// Send message and get response
router.post('/message', async (req, res) => {
  const { threadId, message, petInfo } = req.body;

  try {
    console.log('Processing message:', { threadId, message });

    // Store user message in database
    await pool.query(
      'INSERT INTO chat_messages (pet_id, thread_id, message, role) VALUES ($1, $2, $3, $4)',
      [petInfo.id, threadId, message, 'user']
    );

    // Update last_updated timestamp for the pet
    await pool.query(
      'UPDATE pets SET last_updated = CURRENT_TIMESTAMP WHERE id = $1',
      [petInfo.id]
    );

    // Verify assistant is initialized
    if (!assistant) {
      throw new Error('Assistant not initialized');
    }

    // Add the message to the thread
    console.log('Creating message in thread...');
    const createdMessage = await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message,
    });
    console.log('Message created:', createdMessage.id);

    // Run the assistant
    console.log('Starting assistant run...');
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistant.id,
      instructions: `Consider this pet's information while responding: ${JSON.stringify(
        petInfo
      )}`,
    });
    console.log('Run created:', run.id);

    // Wait for the completion with more detailed status logging
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    let attempts = 0;
    const maxAttempts = 30; // Increase timeout to 60 seconds
    const waitTime = 2000; // Wait 2 seconds between attempts

    while (attempts < maxAttempts) {
      console.log(
        `Run status (attempt ${attempts + 1}/${maxAttempts}):`,
        runStatus.status
      );

      if (runStatus.status === 'completed') {
        break;
      }

      if (runStatus.status === 'failed') {
        // Get the run details to see why it failed
        const runDetails = await openai.beta.threads.runs.retrieve(
          threadId,
          run.id
        );
        console.error('Run failed with details:', runDetails);
        throw new Error(
          `Run failed with status: ${runStatus.status}. Last error: ${
            runDetails.last_error?.message || 'Unknown error'
          }`
        );
      }

      if (runStatus.status === 'expired') {
        throw new Error('Run expired');
      }

      await new Promise((resolve) => setTimeout(resolve, waitTime));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      attempts++;
    }

    if (runStatus.status !== 'completed') {
      throw new Error(
        `Assistant response timed out after ${maxAttempts} seconds. Final status: ${runStatus.status}`
      );
    }

    // Get the messages
    console.log('Retrieving messages...');
    const messages = await openai.beta.threads.messages.list(threadId);

    if (messages.data.length === 0) {
      throw new Error('No messages found in thread');
    }

    const lastMessage = messages.data[0];
    console.log('Retrieved last message:', lastMessage.id);

    if (!lastMessage.content[0]?.text?.value) {
      throw new Error('Invalid message format received');
    }

    const response = lastMessage.content[0].text.value;
    let source = 'assistant'; // Default source

    let finalResponse = response;
    if (
      uncertaintyIndicators.some((indicator) =>
        response.toLowerCase().includes(indicator.toLowerCase())
      )
    ) {
      const searchResults = await searchTavily(message, petInfo);

      if (searchResults && searchResults.length > 0) {
        const result = searchResults[0]; // We now only have one processed result
        finalResponse =
          `Based on veterinary sources, here's what I found:\n\n${result.content}\n\n` +
          `Sources consulted:\n${result.sources
            .map((source) => `• ${source.title}\n  ${source.url}`)
            .join('\n')}`;
        source = 'tavily';
      }
    }

    // Store in database with source information
    await pool.query(
      'INSERT INTO chat_messages (pet_id, thread_id, message, role, source) VALUES ($1, $2, $3, $4, $5)',
      [petInfo.id, threadId, finalResponse, 'assistant', source]
    );

    res.json({
      response: finalResponse,
      source: source, // Include source in response
    });
  } catch (error) {
    console.error('Error in /message route:', error);
    res.status(500).json({
      error: error.message,
      details: error.toString(),
      stack: error.stack,
    });
  }
});

// Add this new route to get chat history for a specific pet
router.get('/chat-history/:petId', async (req, res) => {
  try {
    const { petId } = req.params;
    const chatHistory = await pool.query(
      'SELECT * FROM chat_messages WHERE pet_id = $1 ORDER BY created_at ASC',
      [petId]
    );
    res.json(chatHistory.rows);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this function to check if update is needed (5 minutes threshold)
async function needsUpdate(petId) {
  console.log('Checking if pet needs update:', petId);

  const result = await pool.query(
    "SELECT last_updated AT TIME ZONE 'UTC' as last_updated FROM pets WHERE id = $1",
    [petId]
  );

  if (!result.rows[0]) {
    console.log('No last_updated found for pet:', petId);
    return true;
  }

  const lastUpdated = new Date(result.rows[0].last_updated);
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  const needsUpdate = lastUpdated < fiveMinutesAgo;
  console.log('Update check result:', {
    petId,
    lastUpdated: lastUpdated.toISOString(),
    currentTime: now.toISOString(),
    fiveMinutesAgo: fiveMinutesAgo.toISOString(),
    needsUpdate,
  });

  return needsUpdate;
}

// Add this function to handle health update prompts
async function getHealthUpdate(threadId, petInfo) {
  const updateMessage = `It's been a while since our last conversation about ${petInfo.name}. 
                          Could you please tell me how ${petInfo.name} is doing now? 
                          Have the symptoms (${petInfo.symptoms}) improved? 
                          Are there any new symptoms or changes in condition?`;

  const createdMessage = await openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content: updateMessage,
  });

  return updateMessage;
}

// Add this new route to check if update is needed
router.get('/check-update/:petId', async (req, res) => {
  try {
    const { petId } = req.params;
    const needsHealthUpdate = await needsUpdate(petId);

    console.log('Update check for pet:', {
      petId,
      needsUpdate: needsHealthUpdate,
    });

    res.json({ needsUpdate: needsHealthUpdate });
  } catch (error) {
    console.error('Error checking update status:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
