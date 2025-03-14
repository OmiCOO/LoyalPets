const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { tavily } = require('@tavily/core');
const pool = require('../config/database');
const { isAdmin } = require('./adminRoutes');

// Update the uncertainty indicators to include location-based queries
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
  'find a veterinarian',
  'looking for a vet',
  'veterinarians in',
  'vets in',
  'veterinary clinics',
  'animal hospitals',
  'find a vet',
  'vet near',
  'veterinarian near',
  'recommend a vet',
  'looking for veterinary',
  'need a veterinarian',
  'veterinary care in',
  'vet clinics in',
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
      instructions: `You are a friendly and caring pet health assistant. Your role is to provide helpful advice about pet health care 
                    in a warm and empathetic manner. When responding, consider the pet's information and use their name frequently 
                    to make the conversation more personal. Be encouraging and supportive while maintaining professionalism.
                    Use a conversational tone and break down complex medical information into easy-to-understand language.
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

// Update the searchTavily function to handle location-based queries
async function searchTavily(query, petInfo) {
  try {
    console.log('Starting Tavily search with client:', !!tvly);

    // Determine if this is a location-based veterinary query
    const isLocationQuery = query.toLowerCase().includes('veterinarian') || 
                          query.toLowerCase().includes('vet') ||
                          query.toLowerCase().includes('animal hospital');

    const searchConfig = {
      search_depth: 'advanced',
      include_answer: true,
      max_results: 5,
      exclude_domains: [
        'quora.com',
        'facebook.com',
        'twitter.com',
        'reddit.com',
        'instagram.com',
        'tiktok.com',
      ],
    };

    // Adjust search configuration for location-based queries
    if (isLocationQuery) {
      searchConfig.include_domains = [
        'aaha.org',
        'avma.org',
        'yelp.com',
        'healthypets.com',
        'veterinarians.com',
        'vcahospitals.com',
      ];
    } else {
      searchConfig.include_domains = [
        'petmd.com',
        'vcahospitals.com',
        'merckvetmanual.com',
        'aaha.org',
        'avma.org',
        'vet.cornell.edu',
        'vetmed.ucdavis.edu',
      ];
    }

    const response = await tvly.search(query, searchConfig);

    console.log('Raw Tavily response:', response);

    if (!response || !response.results || response.results.length === 0) {
      return [];
    }

    // Modify the context for location-based queries
    const context = isLocationQuery
      ? `Given the following search results about veterinary services, please extract and summarize 
         the most relevant information about veterinary clinics and services. Focus on providing 
         practical information about finding and choosing veterinary care. Format the clinic names 
         and contact information in a clear, organized way. Include any relevant websites or contact 
         details as markdown links.`
      : `Given the following search results about ${petInfo.type} health, 
         specifically regarding ${petInfo.disease} with symptoms: ${petInfo.symptoms}, 
         please extract and summarize the most relevant medical information. 
         Focus on treatment options, care instructions, and important medical facts.
         Format any references as markdown links.
         Exclude any general or non-medical content.`;

    const searchContent = response.results
      .map((r) => `Source: [${r.title}](${r.url})\n${r.content}`)
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

    // Return processed results with formatted links
    return [
      {
        title: 'Veterinary Information Summary',
        content: processedContent,
        url: response.results[0].url,
        sources: response.results.map((r) => ({
          title: r.title,
          url: r.url,
          formattedLink: `[${r.title}](${r.url})`
        })),
      },
    ];
  } catch (error) {
    console.error('Error in searchTavily:', error);
    return [];
  }
}

// Add these helper functions at the top of the file
async function createChatSession(userId, deviceType) {
  const result = await pool.query(
    'INSERT INTO chat_sessions (user_id, device_type) VALUES ($1, $2) RETURNING id',
    [userId, deviceType]
  );
  return result.rows[0].id;
}

async function updateChatSession(sessionId, messageCount) {
  await pool.query(
    'UPDATE chat_sessions SET messages_count = $1 WHERE id = $2',
    [messageCount, sessionId]
  );
}

async function endChatSession(sessionId) {
  await pool.query(
    'UPDATE chat_sessions SET end_time = CURRENT_TIMESTAMP WHERE id = $1',
    [sessionId]
  );
}

async function detectTopic(message) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Categorize this pet health message into one of these topics: Symptoms, Treatment, Diet, Emergency, Behavior, Prevention, Medication, General Care. Return only the topic name.'
        },
        { role: 'user', content: message }
      ],
      temperature: 0.3,
      max_tokens: 10
    });
    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error detecting topic:', error);
    return 'General Care';
  }
}

// Store run status in memory (in production, use a database or Redis)
const runStatusMap = new Map();

// No longer needed - would timeout on Vercel's free tier
// router.post('/message-sync', async (req, res) => {
//   // Long-running endpoint code removed
// });

// Add a new endpoint to check message status
router.get('/message-status/:runId', async (req, res) => {
  const { runId } = req.params;
  
  try {
    // Check if we have the run in our map
    if (!runStatusMap.has(runId)) {
      // If not in our map, check with OpenAI directly
      try {
        const threadId = req.query.threadId;
        if (!threadId) {
          return res.status(400).json({ 
            error: 'threadId query parameter is required when runId is not found in local cache' 
          });
        }
        
        const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
        
        if (runStatus.status === 'completed') {
          // Get the messages
          const messages = await openai.beta.threads.messages.list(threadId);
          if (messages.data.length === 0) {
            return res.status(404).json({ error: 'No messages found in thread' });
          }
          
          const lastMessage = messages.data[0];
          if (!lastMessage.content[0]?.text?.value) {
            return res.status(500).json({ error: 'Invalid message format received' });
          }
          
          return res.json({
            status: 'completed',
            response: lastMessage.content[0].text.value,
            source: 'assistant'
          });
        } else {
          return res.json({
            status: runStatus.status,
            message: 'Your request is still being processed.'
          });
        }
      } catch (error) {
        return res.status(404).json({ 
          error: 'Run not found or error retrieving run status',
          details: error.message
        });
      }
    }
    
    // Get the run status from our map
    const runInfo = runStatusMap.get(runId);
    
    if (runInfo.status === 'completed') {
      // Return the completed response
      res.json({
        status: 'completed',
        response: runInfo.response,
        source: runInfo.source
      });
      
      // Clean up the map to prevent memory leaks (optional)
      // Only remove after a successful response
      runStatusMap.delete(runId);
    } else if (runInfo.status === 'failed') {
      res.status(500).json({
        status: 'failed',
        error: runInfo.error
      });
    } else {
      // Still in progress
      res.json({
        status: runInfo.status,
        message: 'Your request is still being processed.'
      });
    }
  } catch (error) {
    console.error('Error checking message status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Function to process the run in the background
async function processRunInBackground(runId, threadId, petInfo, messageId, sessionId, startTime) {
  try {
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
    let attempts = 0;
    const maxAttempts = 30; // Increase timeout to 60 seconds
    const waitTime = 2000; // Wait 2 seconds between attempts

    // Update the run info with the current status
    runStatusMap.set(runId, {
      ...runStatusMap.get(runId),
      status: runStatus.status,
      attempts
    });

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
          runId
        );
        console.error('Run failed with details:', runDetails);
        
        // Update the run status map
        runStatusMap.set(runId, {
          ...runStatusMap.get(runId),
          status: 'failed',
          error: `Run failed with status: ${runStatus.status}. Last error: ${
            runDetails.last_error?.message || 'Unknown error'
          }`
        });
        
        return;
      }

      if (runStatus.status === 'expired') {
        // Update the run status map
        runStatusMap.set(runId, {
          ...runStatusMap.get(runId),
          status: 'failed',
          error: 'Run expired'
        });
        
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, waitTime));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
      attempts++;
      
      // Update the run info with the current status
      runStatusMap.set(runId, {
        ...runStatusMap.get(runId),
        status: runStatus.status,
        attempts
      });
    }

    if (runStatus.status !== 'completed') {
      // Update the run status map
      runStatusMap.set(runId, {
        ...runStatusMap.get(runId),
        status: 'failed',
        error: `Assistant response timed out after ${maxAttempts} seconds. Final status: ${runStatus.status}`
      });
      
      return;
    }

    // Get the messages
    console.log('Retrieving messages...');
    const messages = await openai.beta.threads.messages.list(threadId);

    if (messages.data.length === 0) {
      // Update the run status map
      runStatusMap.set(runId, {
        ...runStatusMap.get(runId),
        status: 'failed',
        error: 'No messages found in thread'
      });
      
      return;
    }

    const lastMessage = messages.data[0];
    console.log('Retrieved last message:', lastMessage.id);

    if (!lastMessage.content[0]?.text?.value) {
      // Update the run status map
      runStatusMap.set(runId, {
        ...runStatusMap.get(runId),
        status: 'failed',
        error: 'Invalid message format received'
      });
      
      return;
    }

    const response = lastMessage.content[0].text.value;
    let source = 'assistant'; // Default source

    let finalResponse = response;
    if (
      uncertaintyIndicators.some((indicator) =>
        response.toLowerCase().includes(indicator.toLowerCase())
      )
    ) {
      const searchResults = await searchTavily(petInfo.message, petInfo);

      if (searchResults && searchResults.length > 0) {
        const result = searchResults[0];
        finalResponse = 
          `Based on veterinary sources, here's what I found:\n\n${result.content}\n\n` +
          `Helpful resources:\n${result.sources
            .map((source) => source.formattedLink)
            .join('\n')}`;
        source = 'tavily';
      }
    }

    // Calculate response time
    const endTime = new Date();
    const responseTime = endTime - startTime;

    // Store assistant message with metrics - handle sessionId being null
    try {
      // Use different queries based on whether session_id is available
      if (sessionId) {
        await pool.query(
          'INSERT INTO chat_messages (pet_id, thread_id, message, role, response_time, is_understood, session_id, source) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [
            petInfo.id,
            threadId,
            finalResponse,
            'assistant',
            `${responseTime} milliseconds`,
            !uncertaintyIndicators.some(indicator => 
              response.toLowerCase().includes(indicator.toLowerCase())
            ),
            sessionId,
            source
          ]
        );
        
        // Update session message count only if we have a valid session
        await updateChatSession(sessionId, 2); // Increment by 2 (user + assistant)
      } else {
        // Insert without session_id
        await pool.query(
          'INSERT INTO chat_messages (pet_id, thread_id, message, role, response_time, is_understood, source) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [
            petInfo.id,
            threadId,
            finalResponse,
            'assistant',
            `${responseTime} milliseconds`,
            !uncertaintyIndicators.some(indicator => 
              response.toLowerCase().includes(indicator.toLowerCase())
            ),
            source
          ]
        );
      }
    } catch (dbError) {
      console.error('Error storing assistant message:', dbError);
      // Even if DB storage fails, we'll still return the response to the user
    }

    // Update the run status map with the completed response
    runStatusMap.set(runId, {
      ...runStatusMap.get(runId),
      status: 'completed',
      response: finalResponse,
      source,
      responseTime
    });

  } catch (error) {
    console.error('Error in background processing:', error);
    
    // Update the run status map
    runStatusMap.set(runId, {
      ...runStatusMap.get(runId),
      status: 'failed',
      error: error.message
    });
  }
}

// Add new endpoint to end chat session
router.post('/end-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    await endChatSession(sessionId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: error.message });
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

router.post('/end-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    // Check if session already ended
    const sessionCheck = await pool.query(
      'SELECT end_time FROM chat_sessions WHERE id = $1',
      [sessionId]
    );
    
    if (sessionCheck.rows[0]?.end_time) {
      return res.json({ success: true, message: 'Session already ended' });
    }
    
    await endChatSession(sessionId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add back the original async message endpoint
router.post('/message', async (req, res) => {
  const { threadId, message, petInfo } = req.body;
  const startTime = new Date();
  let sessionId = null;

  try {
    // Get user agent and extract device type
    const userAgent = req.headers['user-agent'];
    const deviceType = userAgent.includes('Mobile') ? 'mobile' : 'desktop';

    // Verify petInfo has a valid userId
    const userId = petInfo?.userId || null;
    
    // Create or get session ID from request with validation
    if (!req.headers['session-id']) {
      if (userId) {
        try {
          sessionId = await createChatSession(userId, deviceType);
          console.log(`Created new session ${sessionId} for user ${userId}`);
        } catch (sessionError) {
          console.error('Error creating chat session:', sessionError);
          // Continue without a session ID
        }
      } else {
        console.log('No userId provided, proceeding without session tracking');
      }
    } else {
      sessionId = req.headers['session-id'];
    }

    // Store user message in database with session check
    const userMessageResult = await pool.query(
      sessionId 
        ? 'INSERT INTO chat_messages (pet_id, thread_id, message, role, session_id) VALUES ($1, $2, $3, $4, $5) RETURNING id'
        : 'INSERT INTO chat_messages (pet_id, thread_id, message, role) VALUES ($1, $2, $3, $4) RETURNING id',
      sessionId 
        ? [petInfo.id, threadId, message, 'user', sessionId]
        : [petInfo.id, threadId, message, 'user']
    );

    const messageId = userMessageResult.rows[0].id;

    // Detect and store topic
    const topic = await detectTopic(message);
    await pool.query(
      'INSERT INTO chat_topics (message_id, topic) VALUES ($1, $2)',
      [messageId, topic]
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

    // Store the run information
    runStatusMap.set(run.id, {
      status: 'in_progress',
      threadId,
      petInfo,
      messageId,
      startTime,
      sessionId,
      attempts: 0
    });

    // Start the background processing
    processRunInBackground(run.id, threadId, petInfo, messageId, sessionId, startTime);

    // Return immediately with the run ID
    res.json({
      runId: run.id,
      status: 'in_progress',
      message: 'Your request is being processed. Check the status using the /message-status endpoint.'
    });

  } catch (error) {
    console.error('Error in message processing:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
