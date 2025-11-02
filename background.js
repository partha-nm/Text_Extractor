// Background service worker for Chrome extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('Web Text Extractor & Q&A extension installed');
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveText') {
    // Save extracted text to storage
    const key = request.data.url;
    chrome.storage.local.get([key], (result) => {
      const existingData = result[key] || [];
      existingData.push(request.data);
      chrome.storage.local.set({ [key]: existingData }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (request.action === 'getStoredText') {
    const url = request.url || 'all';
    if (url === 'all') {
      chrome.storage.local.get(null, (items) => {
        sendResponse({ success: true, data: items });
      });
    } else {
      chrome.storage.local.get([url], (result) => {
        sendResponse({ success: true, data: result[url] || [] });
      });
    }
    return true;
  }

  if (request.action === 'clearStorage') {
    chrome.storage.local.clear(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  // Handle Ollama API calls (moved to background to avoid CORS 403 errors)
  if (request.action === 'callOllama') {
    const { endpoint, model, prompt } = request.data;
    
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
        }
      })
    })
    .then(response => {
      if (!response.ok) {
        return response.text().then(errorText => {
          throw new Error(`Ollama API error: ${response.status} ${response.statusText}. ${errorText}`);
        });
      }
      return response.json();
    })
    .then(data => {
      if (data.response) {
        sendResponse({ success: true, response: data.response.trim() });
      } else {
        sendResponse({ success: false, error: 'Invalid response from Ollama API' });
      }
    })
    .catch(error => {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        sendResponse({ success: false, error: 'Cannot connect to Ollama. Make sure Ollama is running and the endpoint is correct.' });
      } else {
        sendResponse({ success: false, error: error.message });
      }
    });
    
    return true; // Keep channel open for async response
  }

  // Test Ollama connection
  if (request.action === 'testOllamaConnection') {
    const { endpoint, model } = request.data;
    
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: 'Say "Hello"',
        stream: false
      })
    })
    .then(response => {
      if (!response.ok) {
        return response.text().then(errorText => {
          throw new Error(`Connection failed: ${response.status} ${response.statusText}`);
        });
      }
      return response.json();
    })
    .then(data => {
      sendResponse({ success: true, message: `✓ Connection successful! Model "${model}" is available.` });
    })
    .catch(error => {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        sendResponse({ success: false, error: '✗ Cannot connect to Ollama. Make sure Ollama is running and the endpoint is correct.' });
      } else {
        sendResponse({ success: false, error: `✗ ${error.message}` });
      }
    });
    
    return true; // Keep channel open for async response
  }
});

