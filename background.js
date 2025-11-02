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

  // Handle API calls (moved to background to avoid CORS 403 errors)
  if (request.action === 'callOllama') {
    const { endpoint, text, question } = request.data;
    
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        question: question
      })
    })
    .then(response => {
      if (!response.ok) {
        return response.text().then(errorText => {
          throw new Error(`API error: ${response.status} ${response.statusText}. ${errorText}`);
        });
      }
      return response.json();
    })
    .then(data => {
      // Handle response - server returns JSON with response field
      let responseText = '';
      if (data.response) {
        responseText = data.response;
      } else if (data.answer) {
        responseText = data.answer;
      } else if (typeof data === 'string') {
        responseText = data;
      } else if (data.text) {
        responseText = data.text;
      } else if (data.message) {
        responseText = data.message;
      } else {
        // If response is an object, try to stringify useful fields
        responseText = JSON.stringify(data);
      }
      
      sendResponse({ success: true, response: responseText.trim() });
    })
    .catch(error => {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        sendResponse({ success: false, error: 'Cannot connect to the API server. Make sure your server is running and the endpoint is correct.' });
      } else {
        sendResponse({ success: false, error: error.message });
      }
    });
    
    return true; // Keep channel open for async response
  }

  // Test API connection
  if (request.action === 'testOllamaConnection') {
    const { endpoint } = request.data;
    
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Test text for connection',
        question: 'Say "Hello"'
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
      sendResponse({ success: true, message: `✓ Connection successful! API server is responding.` });
    })
    .catch(error => {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        sendResponse({ success: false, error: '✗ Cannot connect to the API server. Make sure your server is running and the endpoint is correct.' });
      } else {
        sendResponse({ success: false, error: `✗ ${error.message}` });
      }
    });
    
    return true; // Keep channel open for async response
  }
});

