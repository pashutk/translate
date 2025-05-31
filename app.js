// Default settings - will be overridden by user settings if available
const DEFAULT_SETTINGS = {
    apiUrl: 'https://chat.pashutk.com/api/chat/completions',
    apiKey: '',
    model: 'anthropic.claude-sonnet-4-20250514',
    systemPrompt: 'You are a helpful translator. The user will send you a text. If the text is in English or Russian translate it to Polish, considering my Polish is roughly B1 level. If the text is in Polish translate it to English. Answer in English.'
};

// App state
const appState = {
    isOnline: navigator.onLine,
    messages: [],
    loadingResponse: false,
    settings: { ...DEFAULT_SETTINGS }
};

// Cache for offline operation
let messageCache = [];

// DOM Elements
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const chatForm = document.getElementById('chat-form');
const connectionStatus = document.getElementById('connection-status');
const offlineIndicator = document.getElementById('offline-indicator');
const settingsButton = document.getElementById('settings-button');
const settingsModal = document.getElementById('settings-modal');
const settingsForm = document.getElementById('settings-form');
const closeSettingsButton = document.getElementById('close-settings');
const apiUrlInput = document.getElementById('api-url');
const apiKeyInput = document.getElementById('api-key');
const modelInput = document.getElementById('model-name');
const systemPromptInput = document.getElementById('system-prompt');

// Apply theme based on system preference
function applySystemTheme() {
    // Check if user prefers dark mode
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Apply or remove dark class based on preference
    if (prefersDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

// Watch for system theme changes
function setupSystemThemeWatcher() {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Add listener for theme changes
    darkModeMediaQuery.addEventListener('change', event => {
        if (event.matches) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    });
}

// Set up MutationObserver to monitor chat for content changes
function setupScrollObserver() {
    const observer = new MutationObserver(() => {
        // When changes are detected in the message container, scroll to bottom
        scrollToBottom();
    });
    
    // Start observing the message container for changes
    observer.observe(messagesContainer, {
        childList: true,   // Watch for added/removed nodes
        subtree: true,     // Watch all descendants
        characterData: true, // Watch for text changes
        attributes: true   // Watch for attribute changes
    });
    
    return observer;
}

// Initialize the app
function initApp() {
    // Apply system theme based on preference
    applySystemTheme();
    
    // Set up system theme watcher
    setupSystemThemeWatcher();
    
    // Load settings from local storage
    loadSettings();
    
    // Clear messages for a fresh start
    clearMessages();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check network status
    updateConnectionStatus();
    
    // Auto-resize textarea as user types
    setupTextareaAutoResize();
    
    // Set up mutation observer for auto-scrolling
    setupScrollObserver();
    
    // Display welcome message
    displayWelcomeMessage();
    
    // Initial scroll to bottom
    scrollToBottom();
    
    // Check if API key is provided, if not open settings modal
    if (!appState.settings.apiKey) {
        // Add a short delay to ensure everything is rendered
        setTimeout(() => {
            // Show a message about missing API key
            addAssistantMessage("API key is required to use this application. Please enter your API key in the settings.");
            // Open settings modal
            openSettingsModal();
        }, 300);
    } else {
        // Set focus to input with a slight delay to ensure everything is rendered
        setTimeout(focusInput, 100);
    }
}

// Function to focus the input field
function focusInput() {
    userInput.focus();
}

// Set up event listeners
function setupEventListeners() {
    // Form submission
    chatForm.addEventListener('submit', handleSubmit);
    
    // Network status changes
    window.addEventListener('online', () => {
        appState.isOnline = true;
        updateConnectionStatus();
        processCachedMessages();
    });
    
    window.addEventListener('offline', () => {
        appState.isOnline = false;
        updateConnectionStatus();
    });
    
    // Auto-resize textarea as user types
    userInput.addEventListener('input', () => {
        adjustTextareaHeight(userInput);
    });
    
    // Settings modal
    settingsButton.addEventListener('click', openSettingsModal);
    closeSettingsButton.addEventListener('click', closeSettingsModal);
    settingsForm.addEventListener('submit', saveSettings);
    
    // Close modal when clicking outside of it
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeSettingsModal();
        }
    });
    
    // Focus input when window gains focus
    window.addEventListener('focus', focusInput);
    
    // Focus input when user clicks on the chat container
    document.getElementById('chat-container').addEventListener('click', (e) => {
        // Only focus if they didn't click on a message or other interactive element
        if (e.target.id === 'chat-container' || e.target.id === 'messages') {
            focusInput();
        }
    });
    
    // Add keyboard shortcut: Command+Enter or Control+Enter to submit
    userInput.addEventListener('keydown', (e) => {
        // Check if Command (Mac) or Control (Windows/Linux) is pressed along with Enter
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault(); // Prevent default behavior
            chatForm.requestSubmit(); // Submit the form
        }
    });
}

// Handle form submission
function handleSubmit(event) {
    event.preventDefault();
    
    const message = userInput.value.trim();
    if (!message) return;
    
    // Add user message to the chat
    addUserMessage(message);
    
    // Clear input
    userInput.value = '';
    adjustTextareaHeight(userInput);
    
    // Force additional scroll after user message is displayed
    setTimeout(() => scrollToBottom(), 0);
    setTimeout(() => scrollToBottom(), 50);
    
    // Process the message
    processUserMessage(message);
}

// Process user message
function processUserMessage(message) {
    if (appState.isOnline) {
        sendToLLM(message);
    } else {
        // If offline, cache the message for later
        cacheMessage(message);
        addAssistantMessage("You're currently offline. Your message will be processed when you're back online.");
    }
}

// Send message to LLM via open-webui
async function sendToLLM(message) {
    // Check if API key is provided
    if (!appState.settings.apiKey) {
        hideLoadingIndicator();
        addAssistantMessage("API key is required to use this application. Please enter your API key in the settings.");
        openSettingsModal();
        return;
    }
    
    showLoadingIndicator();
    appState.loadingResponse = true;
    
    try {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${appState.settings.apiKey}`
        };
        
        // Format messages according to the OpenWebUI API
        const messages = [];
        
        // Always include the system prompt with every request
        messages.push({
            role: "system",
            content: appState.settings.systemPrompt
        });
        
        // Add the user message
        messages.push({
            role: "user",
            content: message
        });
        
        const response = await fetch(appState.settings.apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: appState.settings.model,
                messages: messages
            }),
        });
        
        if (!response.ok) {
            throw new Error('Failed to get response from server');
        }
        
        // Check if the response is a stream (SSE)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/event-stream')) {
            // Handle streaming response
            await handleStreamingResponse(response);
        } else {
            // Handle JSON response
            const data = await response.json();
            
            // Remove loading indicator
            hideLoadingIndicator();
            
            // Extract response from the API response format
            const assistantResponse = data.choices && data.choices[0] && data.choices[0].message 
                ? data.choices[0].message.content
                : data.response || 'I received your message, but there was an issue processing it.';
            
            // Add the assistant's response to the chat
            addAssistantMessage(assistantResponse);
            
            // Save messages to local storage
            saveMessages();
        }
        
    } catch (error) {
        console.error('Error sending message to LLM:', error);
        hideLoadingIndicator();
        
        // Show error message
        addAssistantMessage("Sorry, there was an error processing your request. Please try again later.");
        
        // Cache the message for retry
        cacheMessage(message);
    }
    
    appState.loadingResponse = false;
}

// Handle streaming response (SSE format)
async function handleStreamingResponse(response) {
    // Check if we already have a loading indicator
    let loadingElement = document.getElementById('loading-indicator');
    
    // If no loading indicator exists, create one (this shouldn't typically happen)
    if (!loadingElement) {
        // Create a new loading indicator
        showLoadingIndicator();
    }
    
    // We'll reuse the existing loading indicator - no need to create a new one
    
    // Prepare the actual message element but don't add it to DOM yet
    const messageElement = document.createElement('div');
    messageElement.className = 'self-start max-w-[85%] p-3 rounded-lg rounded-bl-sm bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100 markdown-content hidden';
    messageElement.id = 'streaming-message';
    
    // Flag to track if we've received content
    let hasContent = false;
    
    // Prepare for streaming content
    let fullContent = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Decode the chunk
            const chunk = decoder.decode(value, { stream: true });
            
            // Process SSE format (data: <content>\n\n)
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        // Remove 'data: ' prefix
                        const content = line.substring(6);
                        
                        // Check if it's the [DONE] marker
                        if (content.trim() === '[DONE]') continue;
                        
                        // Try to parse as JSON (some APIs send JSON in the data field)
                        try {
                            const jsonData = JSON.parse(content);
                            // Extract the actual text content based on API response format
                            const messageContent = jsonData.choices?.[0]?.delta?.content || 
                                                  jsonData.choices?.[0]?.message?.content ||
                                                  jsonData.content || 
                                                  jsonData.response || 
                                                  '';
                                                  
                            if (messageContent) {
                                fullContent += messageContent;
                                
                                if (!hasContent) {
                                    // First content received - add the message element to DOM and show it
                                    hasContent = true;
                                    messageElement.innerHTML = marked.parse(fullContent);
                                    messagesContainer.appendChild(messageElement);
                                    
                                    // Hide loading indicator
                                    hideLoadingIndicator();
                                    
                                    // Show the message
                                    messageElement.classList.remove('hidden');
                                } else {
                                    // Update existing content
                                    messageElement.innerHTML = marked.parse(fullContent);
                                }
                                
                                scrollToBottom();
                            }
                        } catch (e) {
                            // Not JSON, treat as raw text
                            if (content.trim()) {
                                fullContent += content;
                                
                                if (!hasContent) {
                                    // First content received - add the message element to DOM and show it
                                    hasContent = true;
                                    messageElement.innerHTML = marked.parse(fullContent);
                                    messagesContainer.appendChild(messageElement);
                                    
                                    // Hide loading indicator
                                    hideLoadingIndicator();
                                    
                                    // Show the message
                                    messageElement.classList.remove('hidden');
                                } else {
                                    // Update existing content
                                    messageElement.innerHTML = marked.parse(fullContent);
                                }
                                
                                scrollToBottom();
                            }
                        }
                    } catch (e) {
                        console.error('Error processing streaming chunk:', e);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error reading stream:', error);
    } finally {
        // If we never got any content, show an error message
        if (!hasContent) {
            // Hide loading indicator
            hideLoadingIndicator();
            
            // Show error message
            const errorMessage = 'I received your message, but there was an issue processing it.';
            messageElement.innerHTML = errorMessage;
            messageElement.classList.remove('hidden');
            messagesContainer.appendChild(messageElement);
            fullContent = errorMessage;
        }
        
        // Save the complete message to app state
        appState.messages.push({
            role: 'assistant',
            content: fullContent
        });
        
        // Remove the streaming ID now that we're done
        messageElement.removeAttribute('id');
        
        // Save messages to local storage
        saveMessages();
        
        // Extra aggressive scrolling at the end of streaming
        // Multiple scroll attempts to ensure visibility
        scrollToBottom();
        setTimeout(() => scrollToBottom(), 100);
        setTimeout(() => scrollToBottom(), 300);
        setTimeout(() => scrollToBottom(), 500);
        setTimeout(() => scrollToBottom(), 800);
    }
}

// Add user message to the chat
function addUserMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'self-end max-w-[85%] p-3 rounded-lg rounded-br-sm bg-primary-100 text-gray-800 dark:bg-primary-800 dark:text-gray-100';
    messageElement.textContent = message;
    
    messagesContainer.appendChild(messageElement);
    
    // Save to app state
    appState.messages.push({
        role: 'user',
        content: message
    });
    
    // Immediate scroll to bottom
    scrollToBottom();
    
    // Additional delayed scrolls to ensure visibility
    setTimeout(() => scrollToBottom(), 50);
    setTimeout(() => scrollToBottom(), 150);
    
    // Save messages to local storage
    saveMessages();
}

// Add assistant message to the chat
function addAssistantMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'self-start max-w-[85%] p-3 rounded-lg rounded-bl-sm bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100 markdown-content';
    
    // Parse markdown and set as innerHTML
    messageElement.innerHTML = marked.parse(message);
    
    messagesContainer.appendChild(messageElement);
    
    // Save to app state
    appState.messages.push({
        role: 'assistant',
        content: message
    });
    
    // Immediate scroll to bottom
    scrollToBottom();
    
    // Additional delayed scrolls to ensure visibility after rendering
    setTimeout(() => scrollToBottom(), 50);
    setTimeout(() => scrollToBottom(), 150);
    setTimeout(() => scrollToBottom(), 300);
    
    // Save messages to local storage
    saveMessages();
}

// Show loading indicator
function showLoadingIndicator() {
    const loadingElement = document.createElement('div');
    loadingElement.className = 'self-start flex items-center space-x-1 p-2';
    loadingElement.id = 'loading-indicator';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'h-2 w-2 bg-gray-400 rounded-full animate-pulse dark:bg-gray-500';
        // Add different animation delays
        dot.style.animationDelay = `${i * 0.15}s`;
        loadingElement.appendChild(dot);
    }
    
    messagesContainer.appendChild(loadingElement);
    
    // Scroll to bottom
    scrollToBottom();
}

// Hide loading indicator
function hideLoadingIndicator() {
    // Remove loading indicator
    const loadingElement = document.getElementById('loading-indicator');
    if (loadingElement) {
        loadingElement.remove();
    }
}

// Scroll to bottom of the chat - completely different approach using scrollIntoView
function scrollToBottom() {
    // First ensure the container has proper scroll settings
    messagesContainer.style.overflow = 'auto';
    
    // Get the last child of messagesContainer or create a scroll target if needed
    let lastElement = messagesContainer.lastElementChild;
    
    // Use the dedicated scroll anchor if available
    const scrollAnchor = document.getElementById('scroll-anchor');
    if (scrollAnchor) {
        lastElement = scrollAnchor;
    }
    // If there's no scroll anchor or last element
    else if (!lastElement || !lastElement.scrollIntoView) {
        // Create a dummy element at the bottom to scroll to
        let scrollTarget = document.getElementById('scroll-target');
        if (!scrollTarget) {
            scrollTarget = document.createElement('div');
            scrollTarget.id = 'scroll-target';
            scrollTarget.style.height = '1px';
            scrollTarget.style.width = '100%';
            scrollTarget.style.float = 'left';
            scrollTarget.style.clear = 'both';
            messagesContainer.appendChild(scrollTarget);
        }
        lastElement = scrollTarget;
    }
    
    // Use scrollIntoView - a more direct browser API for scrolling
    try {
        lastElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
        console.error('Error with smooth scrollIntoView:', e);
        // Fallback to instant scroll if smooth fails
        try {
            lastElement.scrollIntoView(true); // true = align to top
        } catch (e2) {
            console.error('Error with basic scrollIntoView:', e2);
            // Final fallback - direct scrollTop manipulation
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    // Also use the traditional approach as backup with delays
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 50);
    
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Try both approaches again after more delay
        if (lastElement && lastElement.scrollIntoView) {
            try {
                lastElement.scrollIntoView(false);
            } catch (e) {
                // Ignore errors in the delayed attempt
            }
        }
    }, 300);
}

// Update connection status
function updateConnectionStatus() {
    if (appState.isOnline) {
        connectionStatus.textContent = 'Online';
        connectionStatus.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        offlineIndicator.classList.add('hidden');
    } else {
        connectionStatus.textContent = 'Offline';
        connectionStatus.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        offlineIndicator.classList.remove('hidden');
    }
}

// Cache message for later sending when back online
function cacheMessage(message) {
    messageCache.push(message);
    // Store in localStorage for persistence
    localStorage.setItem('cachedMessages', JSON.stringify(messageCache));
}

// Process cached messages when back online
function processCachedMessages() {
    if (messageCache.length > 0 && appState.isOnline) {
        // Get cached messages from localStorage if available
        const storedCache = localStorage.getItem('cachedMessages');
        if (storedCache) {
            messageCache = JSON.parse(storedCache);
        }
        
        // Process each message
        const messagesToProcess = [...messageCache];
        messageCache = []; // Clear the cache
        localStorage.removeItem('cachedMessages');
        
        // Send each message
        messagesToProcess.forEach(message => {
            sendToLLM(message);
        });
    }
}

// Save messages to local storage
function saveMessages() {
    localStorage.setItem('chatMessages', JSON.stringify(appState.messages));
}

// Clear all messages and cached data
function clearMessages() {
    // Clear any previous messages from localStorage
    localStorage.removeItem('chatMessages');
    
    // Reset the app state for a fresh start
    appState.messages = [];
    
    // Clear any cached messages too
    localStorage.removeItem('cachedMessages');
    messageCache = [];
}

// Auto-resize textarea as user types
function setupTextareaAutoResize() {
    // Set initial height
    adjustTextareaHeight(userInput);
    
    // Adjust on window resize
    window.addEventListener('resize', () => {
        adjustTextareaHeight(userInput);
    });
}

// Adjust textarea height based on content
function adjustTextareaHeight(textarea) {
    // Reset height to allow proper calculation
    textarea.style.height = 'auto';
    
    // Add a small buffer (1px) to prevent the scrollbar from appearing
    textarea.style.height = (textarea.scrollHeight + 1) + 'px';
    
    // Limit height growth for very long content
    const maxHeight = window.innerHeight * 0.3; // 30% of viewport height
    if (textarea.scrollHeight > maxHeight) {
        textarea.style.height = maxHeight + 'px';
        textarea.style.overflowY = 'auto';
    } else {
        textarea.style.overflowY = 'hidden';
    }
}

// Display welcome message
function displayWelcomeMessage() {
    // Only show welcome message if no history
    if (appState.messages.length === 0) {
        addAssistantMessage("Welcome to Translator Assistant! Type your text and I'll help translate it.");
    }
}

// Settings functions
function openSettingsModal() {
    // Populate form with current settings
    apiUrlInput.value = appState.settings.apiUrl;
    apiKeyInput.value = appState.settings.apiKey;
    modelInput.value = appState.settings.model;
    systemPromptInput.value = appState.settings.systemPrompt;
    
    // Show modal
    settingsModal.classList.remove('hidden');
}

function closeSettingsModal() {
    settingsModal.classList.add('hidden');
    // Refocus the input when settings modal is closed
    setTimeout(focusInput, 100);
}

function saveSettings(event) {
    event.preventDefault();
    
    // Get values from form
    const newSettings = {
        apiUrl: apiUrlInput.value.trim(),
        apiKey: apiKeyInput.value.trim(),
        model: modelInput.value.trim(),
        systemPrompt: systemPromptInput.value.trim()
    };
    
    // Update app state
    appState.settings = newSettings;
    
    // Save to localStorage
    localStorage.setItem('translatorSettings', JSON.stringify(newSettings));
    
    // Close modal
    closeSettingsModal();
    
    // Show confirmation message
    addAssistantMessage("Settings updated successfully.");
}

function loadSettings() {
    const savedSettings = localStorage.getItem('translatorSettings');
    if (savedSettings) {
        try {
            const parsedSettings = JSON.parse(savedSettings);
            // Merge with defaults to ensure all properties exist
            appState.settings = { ...DEFAULT_SETTINGS, ...parsedSettings };
        } catch (error) {
            console.error('Error loading saved settings:', error);
            appState.settings = { ...DEFAULT_SETTINGS };
        }
    } else {
        appState.settings = { ...DEFAULT_SETTINGS };
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', initApp);