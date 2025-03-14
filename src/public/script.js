function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('No auth token found, redirecting to login');
    window.location.href = '/login.html';
    return false;
  }
  console.log('Auth token found, user is authenticated');
  return true;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  window.location.href = '/login.html';
}

document.getElementById('petForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!checkAuth()) return;

  const petData = {
    name: document.getElementById('name').value,
    pet_type: document.getElementById('petType').value,
    breed: document.getElementById('breed').value,
    age: parseInt(document.getElementById('age').value),
    disease: document.getElementById('disease').value,
    symptoms: document.getElementById('symptoms').value,
    user_id: localStorage.getItem('userId'),
  };

  try {
    const response = await fetch('/api/pets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(petData),
    });

    if (response.ok) {
      alert('Pet information saved successfully!');
      loadPets();
      e.target.reset();
    } else {
      alert('Error saving pet information');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error saving pet information');
  }
});

async function loadPets() {
  if (!checkAuth()) return;

  try {
    const response = await fetch('/api/pets', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    const pets = await response.json();
    const petsDiv = document.getElementById('pets');

    petsDiv.innerHTML = pets
      .map(
        (pet) => `
            <div class="pet-card" data-pet-id="${pet.id}">
                <h3>${pet.name}</h3>
                <p>Type: ${pet.pet_type}</p>
                <p>Breed: ${pet.breed}</p>
                <p>Age: ${pet.age}</p>
                <p>Disease: ${pet.disease}</p>
                <p>Symptoms: ${pet.symptoms}</p>
            </div>
        `
      )
      .join('');

    addPetCardListeners();
  } catch (error) {
    console.error('Error:', error);
  }
}

window.onload = async () => {
  if (!checkAuth()) return;
  await loadPets();
  await checkAdminStatus();
};

let currentThreadId = null;
let currentPetInfo = null;
let currentRating = 0;
let messageCount = 0;
const MESSAGE_THRESHOLD = 5; // Show feedback form after 5 messages

// Add these variables at the top
let currentSessionId = null;
let sessionStartTime = null;

let feedbackCount = 0;

// Add click event to pet cards
function addPetCardListeners() {
  console.log('Adding click listeners to pet cards');
  const petCards = document.querySelectorAll('.pet-card');
  console.log(`Found ${petCards.length} pet cards to add listeners to`);
  
  petCards.forEach((card) => {
    card.addEventListener('click', async () => {
      console.log('Pet card clicked with ID:', card.dataset.petId);
      try {
        // Set currentPetInfo first
        currentPetInfo = {
          id: card.dataset.petId,
          name: card.querySelector('h3').textContent,
          type: card
            .querySelector('p:nth-child(2)')
            .textContent.replace('Type: ', ''),
          breed: card
            .querySelector('p:nth-child(3)')
            .textContent.replace('Breed: ', ''),
          disease: card
            .querySelector('p:nth-child(5)')
            .textContent.replace('Disease: ', ''),
          symptoms: card
            .querySelector('p:nth-child(6)')
            .textContent.replace('Symptoms: ', ''),
        };

        console.log('Pet info extracted:', currentPetInfo);

        // First check if pet has an existing thread
        console.log('Fetching pet data from API...');
        const petResponse = await fetch(`/api/pets/${currentPetInfo.id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (!petResponse.ok) {
          throw new Error(`Failed to fetch pet data: ${petResponse.status} ${petResponse.statusText}`);
        }
        
        const petData = await petResponse.json();
        console.log('Pet data retrieved:', petData);

        if (petData.thread_id) {
          console.log('Using existing thread:', petData.thread_id);
          currentThreadId = petData.thread_id;

          // Check if update needed for existing thread
          const updateCheckResponse = await fetch(
            `/api/assistant/check-update/${currentPetInfo.id}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            }
          );
          const updateData = await updateCheckResponse.json();

          if (updateData.needsUpdate) {
            console.log('Health update needed for pet:', currentPetInfo.name);
            document.getElementById('chatInterface').classList.remove('hidden');
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.innerHTML = `
                            <div class="message assistant-message">
                                Hello! I notice it's been a while since our last conversation about ${currentPetInfo.name}. 
                                Could you please tell me how ${currentPetInfo.name} is doing now? 
                                Have there been any changes in their symptoms (${currentPetInfo.symptoms}) or condition?
                            </div>
                        `;
            await handleHealthUpdate();
          } else {
            // Only load chat history if no update is needed
            await loadChatHistory(currentPetInfo.id);
          }
        } else {
          // Create new thread only if one doesn't exist
          console.log('Creating new thread for pet:', currentPetInfo);
          const threadResponse = await fetch('/api/assistant/thread', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              petId: currentPetInfo.id,
              petInfo: currentPetInfo,
            }),
          });

          if (!threadResponse.ok) {
            const errorData = await threadResponse.json();
            throw new Error(
              `Failed to create thread: ${errorData.error || 'Unknown error'}`
            );
          }

          const threadData = await threadResponse.json();
          currentThreadId = threadData.threadId;
          console.log('New thread created:', currentThreadId);

          // Save the thread ID with error handling
          try {
            const savedData = await saveThreadId(
              currentPetInfo.id,
              threadData.threadId
            );
            console.log('Thread ID saved successfully:', savedData);
          } catch (error) {
            console.error('Failed to save thread ID:', error);
            throw error;
          }
        }

        // Load chat history and show interface
        await loadChatHistory(currentPetInfo.id);
        
        // Show chat interface with proper error handling
        const chatInterface = document.getElementById('chatInterface');
        if (chatInterface) {
          chatInterface.classList.remove('hidden');
          console.log('Chat interface is now visible');
          
          // Make sure to scroll to the chat interface
          chatInterface.scrollIntoView({ behavior: 'smooth' });
        } else {
          console.error('Failed to find chat interface element');
          alert('Error: Could not display chat interface. Please refresh the page and try again.');
        }

        // Only add initial message if no chat history
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
          if (!chatMessages.innerHTML.trim()) {
            chatMessages.innerHTML = `
              <div class="message assistant-message">
                  I'm here to help with ${currentPetInfo.name}, a ${
              currentPetInfo.breed
            } ${currentPetInfo.type.toLowerCase()}. 
                  They are currently dealing with ${
                    currentPetInfo.disease
                  }. How can I assist you?
              </div>
            `;
            console.log('Added initial assistant message');
          }
        } else {
          console.error('Could not find chatMessages element');
        }
      } catch (error) {
        console.error('Error handling pet card click:', error);
        alert(`Error: ${error.message || 'An unknown error occurred while loading pet information.'}`);
      }
    });
  });
}

// Add this to your loadPets function after setting innerHTML
loadPets().then(() => {
  addPetCardListeners();
});

// Chat interface event listeners
document.getElementById('closeChatBtn').addEventListener('click', () => {
  console.log('Chat close button clicked');
  showFeedbackForm();
  
  // Only hide chat interface after feedback is submitted
  document.getElementById('submitFeedback').addEventListener('click', () => {
    document.getElementById('chatInterface').classList.add('hidden');
    document.getElementById('feedbackForm').classList.add('hidden');
    messageCount = 0;
  }, { once: true });
});

document.getElementById('sendMessage').addEventListener('click', async () => {
  const messageInput = document.getElementById('userMessage');
  const message = messageInput.value.trim();

  if (!message) return;

  console.log('Sending chat with:', {
    threadId: currentThreadId,
    message: message,
    petInfo: currentPetInfo,
  });

  // Add user message to chat
  addMessageToChat(message, 'user');
  messageInput.value = '';

  // Add loading indicator
  const loadingId = Date.now();
  const chatMessages = document.getElementById('chatMessages');
  const loadingElement = document.createElement('div');
  loadingElement.id = `loading-${loadingId}`;
  loadingElement.className = 'message assistant-message';
  loadingElement.innerHTML = '<em>Assistant is thinking...</em>';
  chatMessages.appendChild(loadingElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    // Use the improved sendMessage function which handles the polling internally
    await sendMessage(message);
    
    // Remove loading message if it still exists
    const loadingIndicator = document.getElementById(`loading-${loadingId}`);
    if (loadingIndicator) {
      loadingIndicator.remove();
    }
  } catch (error) {
    console.error('Error:', error);
    // Remove loading message if it still exists
    const loadingIndicator = document.getElementById(`loading-${loadingId}`);
    if (loadingIndicator) {
      loadingIndicator.remove();
    }

    chatMessages.innerHTML += `
        <div class="message assistant-message error">
            Error: ${error.message || 'Failed to get response'}
        </div>
    `;
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});

async function loadChatHistory(petId) {
  try {
    const response = await fetch(`/api/assistant/chat-history/${petId}`);
    if (!response.ok) throw new Error('Failed to fetch chat history');

    const chatHistory = await response.json();
    const chatMessages = document.getElementById('chatMessages');

    // Render existing chat history
    chatMessages.innerHTML = chatHistory
      .map(
        (msg) => `
            <div class="message ${msg.role}-message">
                ${msg.message}
            </div>
        `
      )
      .join('');

    // Check if update is needed
    const updateCheckResponse = await fetch(
      `/api/assistant/check-update/${petId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      }
    );
    const updateData = await updateCheckResponse.json();

    if (updateData.needsUpdate) {
      // Add update request message
      chatMessages.innerHTML += `
                <div class="message assistant-message">
                    Hello! I notice it's been a while since our last conversation about ${currentPetInfo.name}. 
                    Could you please tell me how ${currentPetInfo.name} is doing now? 
                    Have there been any changes in their symptoms (${currentPetInfo.symptoms}) or condition?
                </div>
            `;
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (error) {
    console.error('Error loading chat history:', error);
  }
}

function addMessageToChat(message, role, source) {
  const chatMessages = document.getElementById('chatMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}-message`;

  // Add source indicator for assistant messages
  if (role === 'assistant') {
    const sourceIndicator = document.createElement('span');
    sourceIndicator.className = `source-indicator ${source}`;
    sourceIndicator.textContent = source === 'tavily' ? '🔍 Tavily Search' : '🤖 AI Assistant';
    messageDiv.appendChild(sourceIndicator);

    // Add feedback buttons for assistant messages
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'message-feedback';
    feedbackDiv.innerHTML = `
      <button class="feedback-btn thumbs-up" onclick="handleFeedback(this, true)">👍</button>
      <button class="feedback-btn thumbs-down" onclick="handleFeedback(this, false)">👎</button>
    `;
    messageDiv.appendChild(feedbackDiv);
  }

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = message;
  messageDiv.appendChild(contentDiv);

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage(message) {
  try {
    // Check for required values
    if (!currentThreadId) {
      console.error('No thread ID available');
      addMessageToChat('Error: No conversation thread available. Please reload the page and try again.', 'assistant', 'error');
      return;
    }
    
    if (!currentPetInfo || !currentPetInfo.id) {
      console.error('No pet information available');
      addMessageToChat('Error: Pet information is missing. Please reload the page and try again.', 'assistant', 'error');
      return;
    }
    
    // Get stored user ID with fallback
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.warn('No user ID found in local storage, this may cause tracking issues');
    }
    
    // Use the original asynchronous endpoint that's serverless-friendly
    const response = await fetch('/api/assistant/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Session-Id': currentSessionId || ''
      },
      body: JSON.stringify({
        threadId: currentThreadId,
        message: message,
        petInfo: {
          ...currentPetInfo,
          userId: userId
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get response');
    }

    const data = await response.json();
    
    // Store session ID if this is the first message
    if (!currentSessionId && data.sessionId) {
      currentSessionId = data.sessionId;
    }

    // Chat message should be in-progress with a runId
    if (data.status === 'in_progress' && data.runId) {
      // Poll for the message status until completed
      await pollForCompletion(data.runId, currentThreadId);
    } else if (data.response) {
      // For immediate responses (rare case but handle it)
      addMessageToChat(data.response, 'assistant', data.source || 'assistant');
    } else {
      // Fallback for unexpected response format
      console.error('Unexpected response format:', data);
      addMessageToChat("Sorry, I couldn't process your request properly.", 'assistant', 'error');
    }

    messageCount++;
    
    if (messageCount >= MESSAGE_THRESHOLD) {
      showFeedbackForm();
    }
  } catch (error) {
    console.error('Error:', error);
    addMessageToChat(`Sorry, there was an error: ${error.message}`, 'assistant', 'error');
  }
}

// Helper function to poll for message completion
async function pollForCompletion(runId, threadId) {
  // Poll with exponential backoff
  const maxAttempts = 30;
  let attempt = 0;
  let delay = 1000; // Start with 1 second delay

  // Find any existing loading indicators
  const loadingIndicators = document.querySelectorAll('.assistant-message em');
  const updateLoadingText = (text) => {
    loadingIndicators.forEach(indicator => {
      if (indicator.textContent.includes('thinking') || indicator.textContent.includes('...')) {
        indicator.textContent = text;
      }
    });
  };
  
  while (attempt < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      // Update loading text to show we're still working
      updateLoadingText(`Assistant is thinking${'.'.repeat((attempt % 3) + 1)}`);
      
      const statusResponse = await fetch(`/api/assistant/message-status/${runId}?threadId=${threadId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!statusResponse.ok) {
        const errorData = await statusResponse.json();
        throw new Error(errorData.error || 'Failed to check message status');
      }
      
      const statusData = await statusResponse.json();
      
      // Add more detailed debugging
      console.log('Full statusData response:', JSON.stringify(statusData, null, 2));
      
      if (statusData.status === 'completed') {
        // We have the final response
        console.log('Response received:', statusData.response);
        
        // Check for undefined response explicitly
        if (!statusData.response) {
          console.error('Error: Response is undefined or empty from the server');
          addMessageToChat('Sorry, I received an empty response. Please try again later.', 'assistant', 'error');
          return false;
        }
        
        addMessageToChat(statusData.response, 'assistant', statusData.source || 'assistant');
        return true;
      } else if (statusData.status === 'failed') {
        // Handle error
        console.error('Assistant run failed:', statusData.error);
        addMessageToChat(`Sorry, I encountered an error: ${statusData.error}`, 'assistant', 'error');
        return false;
      }
      
      // We're still waiting for completion
      console.log(`Polling attempt ${attempt + 1}/${maxAttempts}: Status is ${statusData.status}`);
      
      // Increase delay with each attempt (exponential backoff)
      delay = Math.min(delay * 1.5, 5000); // Cap at 5 seconds
      attempt++;
    } catch (error) {
      console.error('Error polling for status:', error);
      // Continue polling despite errors
      delay = Math.min(delay * 1.5, 5000);
      attempt++;
    }
  }
  
  // Timed out after max attempts
  addMessageToChat("Sorry, it's taking longer than expected to process your request. Please try again later.", 'assistant', 'error');
  return false;
}

async function handleHealthUpdate() {
  const updateForm = document.createElement('div');
  updateForm.className = 'health-update-form';
  updateForm.innerHTML = `
        <div class="update-container">
            <h3>Please update ${currentPetInfo.name}'s health status:</h3>
            <div class="form-group">
                <label>Current Symptoms:</label>
                <textarea id="newSymptoms" placeholder="Current symptoms">${currentPetInfo.symptoms}</textarea>
            </div>
            <div class="form-group">
                <label>Current Condition:</label>
                <textarea id="newDisease" placeholder="Current condition">${currentPetInfo.disease}</textarea>
            </div>
            <button onclick="submitHealthUpdate()">Update Health Status</button>
        </div>
    `;

  const chatMessages = document.getElementById('chatMessages');
  chatMessages.insertBefore(updateForm, chatMessages.firstChild);

  // Add the update request message
  chatMessages.innerHTML += `
        <div class="message assistant-message">
            Hello! It's been a while since our last conversation about ${currentPetInfo.name}. 
            Please update their current health status above before we continue.
        </div>
    `;
}

async function submitHealthUpdate() {
  try {
    const symptoms = document.getElementById('newSymptoms').value;
    const disease = document.getElementById('newDisease').value;

    console.log('Submitting health update:', { symptoms, disease });

    const response = await fetch(
      `/api/pets/${currentPetInfo.id}/health-update`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ symptoms, disease }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update health status');
    }

    const updatedPet = await response.json();
    console.log('Health update successful:', updatedPet);

    // Update current pet info
    currentPetInfo.symptoms = symptoms;
    currentPetInfo.disease = disease;

    // Remove update form
    document.querySelector('.health-update-form').remove();

    // Send update confirmation to assistant
    const updateMessage = `My pet's current status: Symptoms: ${symptoms}, Condition: ${disease}`;
    await sendMessage(updateMessage);

    // Refresh the pet card display
    await loadPets();
  } catch (error) {
    console.error('Error updating health status:', error);
    alert('Failed to update health status: ' + error.message);
  }
}

async function saveThreadId(petId, threadId) {
  try {
    console.log('Attempting to save thread ID:', {
      petId,
      threadId,
      token: !!localStorage.getItem('token'), // Log if token exists
    });

    const response = await fetch(`/api/pets/${petId}/thread`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ thread_id: threadId }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Server responded with error:', responseData);
      throw new Error(responseData.message || 'Failed to save thread ID');
    }

    console.log('Thread ID save response:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error in saveThreadId:', error);
    throw error;
  }
}

document.querySelectorAll('.star').forEach(star => {
  star.addEventListener('mouseover', (e) => {
    const rating = e.target.dataset.rating;
    highlightStars(rating);
  });

  star.addEventListener('mouseout', () => {
    highlightStars(currentRating);
  });

  star.addEventListener('click', (e) => {
    currentRating = e.target.dataset.rating;
    highlightStars(currentRating);
  });
});

function highlightStars(rating) {
  document.querySelectorAll('.star').forEach(star => {
    star.classList.toggle('active', star.dataset.rating <= rating);
  });
}

document.getElementById('submitFeedback').addEventListener('click', async () => {
  if (!currentRating) {
    alert('Please select a rating');
    return;
  }

  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        pet_id: currentPetInfo.id,
        thread_id: currentThreadId,
        rating: currentRating,
        comment: document.getElementById('feedbackComment').value
      }),
    });

    if (!response.ok) throw new Error('Failed to submit feedback');

    document.getElementById('feedbackForm').classList.add('hidden');
    alert('Thank you for your feedback!');
    
    // Reset form
    currentRating = 0;
    highlightStars(0);
    document.getElementById('feedbackComment').value = '';
  } catch (error) {
    console.error('Error submitting feedback:', error);
    alert('Failed to submit feedback');
  }
});

// Add this function to handle showing the feedback form
function showFeedbackForm() {
    const feedbackForm = document.getElementById('feedbackForm');
    if (feedbackForm) {
        feedbackForm.classList.remove('hidden');
        console.log('Feedback form displayed');
    } else {
        console.error('Feedback form element not found');
    }
}

async function checkAdminStatus() {
  try {
    const response = await fetch('/api/admin/stats', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      document.getElementById('adminNav').style.display = 'block';
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
  }
}

// Modify the existing chat initialization
async function initializeChat(petId) {
  try {
    // ... existing initialization code ...
    
    // Create a new chat session
    currentSessionId = await createChatSession(
      localStorage.getItem('userId'),
      navigator.userAgent
    );
    
    // Add event listener for page unload
    window.addEventListener('beforeunload', (event) => {
      // Send a synchronous request to end the session
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/assistant/end-session', false); // false makes it synchronous
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
      xhr.send(JSON.stringify({ sessionId: currentSessionId }));
      
      currentSessionId = null;
      sessionStartTime = null;
    });

  } catch (error) {
    console.error('Error initializing chat:', error);
  }
}

// Add function to end chat session
async function endChatSession() {
  if (!currentSessionId) return;

  try {
    await fetch('/api/assistant/end-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        sessionId: currentSessionId
      })
    });

    currentSessionId = null;
    sessionStartTime = null;
  } catch (error) {
    console.error('Error ending chat session:', error);
  }
}

// Modify the closeChatInterface function
function closeChatInterface() {
  if (currentSessionId) {
    endChatSession().then(() => {
      document.getElementById('chatInterface').classList.add('hidden');
      currentSessionId = null;
      sessionStartTime = null;
    });
  } else {
    document.getElementById('chatInterface').classList.add('hidden');
  }
}

async function handleFeedback(button, isPositive) {
  const messageDiv = button.closest('.message');
  const content = messageDiv.querySelector('.message-content').textContent;
  
  try {
    const response = await fetch('/api/feedback/quick', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        pet_id: currentPetInfo.id,
        thread_id: currentThreadId,
        message: content,
        is_positive: isPositive,
        session_id: currentSessionId
      })
    });

    if (response.ok) {
      // Disable both buttons after feedback
      const buttons = messageDiv.querySelectorAll('.feedback-btn');
      buttons.forEach(btn => btn.disabled = true);
      
      // Increment feedback count and check if we should show the improvement question
      feedbackCount++;
      if (feedbackCount % 3 === 0) {
        showImprovementQuestion();
      }
    }
  } catch (error) {
    console.error('Error submitting feedback:', error);
  }
}

function showImprovementQuestion() {
  const questionDiv = document.createElement('div');
  questionDiv.className = 'improvement-question';
  questionDiv.innerHTML = `
    <h4>Tell us more about how we can improve!</h4>
    <textarea placeholder="Your suggestions help us get better..."></textarea>
    <div class="button-group">
      <button onclick="submitImprovement(this)">Submit</button>
      <button onclick="skipImprovement(this)">Skip</button>
    </div>
  `;
  
  document.getElementById('chatMessages').appendChild(questionDiv);
}

async function submitImprovement(button) {
  const questionDiv = button.closest('.improvement-question');
  const feedback = questionDiv.querySelector('textarea').value;
  
  try {
    await fetch('/api/feedback/improvement', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        feedback,
        session_id: currentSessionId
      })
    });
    
    questionDiv.remove();
  } catch (error) {
    console.error('Error submitting improvement feedback:', error);
  }
}

function skipImprovement(button) {
  button.closest('.improvement-question').remove();
}
