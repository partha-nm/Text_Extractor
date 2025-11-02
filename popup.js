// Popup script for Chrome extension

let currentTab = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  // Set current page URL
  if (currentTab) {
    document.getElementById('currentPageUrl').textContent = 
      new URL(currentTab.url).hostname || currentTab.url;
  }

  // Tab switching
  setupTabSwitching();
  
  // Button event listeners
  setupEventListeners();
  
  // Load cached pages
  loadCachedPages();
  
  // Load source URLs for Q&A
  loadSourceUrls();
});

function setupTabSwitching() {
  const tabs = ['extract', 'cached', 'qa', 'settings'];
  tabs.forEach(tabName => {
    const btn = document.getElementById(`${tabName}Tab`);
    const section = document.getElementById(`${tabName}Section`);
    
    btn.addEventListener('click', () => {
      // Remove active class from all tabs and sections
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
      
      // Add active class to clicked tab and section
      btn.classList.add('active');
      section.classList.add('active');
      
      // Reload data when switching tabs
      if (tabName === 'cached') {
        loadCachedPages();
      } else if (tabName === 'qa') {
        loadSourceUrls();
      } else if (tabName === 'settings') {
        loadOllamaSettings();
      }
    });
  });
}

function setupEventListeners() {
  // Extract button
  document.getElementById('extractBtn').addEventListener('click', extractCurrentPage);
  
  // Clear cache button
  document.getElementById('clearCacheBtn').addEventListener('click', clearAllCache);
  
  // Ask question button
  document.getElementById('askQuestionBtn').addEventListener('click', askQuestion);
  
  // Settings buttons
  document.getElementById('saveSettingsBtn').addEventListener('click', saveOllamaSettings);
  document.getElementById('testConnectionBtn').addEventListener('click', testOllamaConnection);
}

async function extractCurrentPage() {
  const extractBtn = document.getElementById('extractBtn');
  const statusDiv = document.getElementById('extractStatus');
  const previewDiv = document.getElementById('extractPreview');
  
  extractBtn.disabled = true;
  statusDiv.className = 'status-message info';
  statusDiv.textContent = 'Extracting highlighted text...';
  statusDiv.style.display = 'block';
  previewDiv.classList.remove('show');
  
  try {
    // Inject and execute extraction
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Get selected/highlighted text
        const selection = window.getSelection();
        let selectedText = '';
        
        if (selection && selection.toString().trim().length > 0) {
          selectedText = selection.toString().trim();
        } else {
          // If no selection, return an error message
          return null;
        }

        return {
          url: window.location.href,
          title: document.title,
          text: selectedText,
          timestamp: new Date().toISOString(),
          wordCount: selectedText.split(/\s+/).filter(word => word.length > 0).length
        };
      }
    });
    
    if (results && results[0] && results[0].result) {
      const extractedData = results[0].result;
      
      // Check if user selected any text
      if (!extractedData) {
        statusDiv.className = 'status-message error';
        statusDiv.textContent = '✗ No text selected. Please highlight the text you want to extract.';
        return;
      }
      
      // Save to storage
      await saveToStorage(extractedData);
      
      // Show success
      statusDiv.className = 'status-message success';
      statusDiv.textContent = `✓ Extracted ${extractedData.wordCount} words from selected text`;
      
      // Show preview
      previewDiv.textContent = extractedData.text.substring(0, 500) + 
        (extractedData.text.length > 500 ? '...' : '');
      previewDiv.classList.add('show');
      
      // Refresh cached list if on that tab
      if (document.getElementById('cachedSection').classList.contains('active')) {
        loadCachedPages();
      }
      
      // Refresh Q&A source list
      loadSourceUrls();
    } else {
      throw new Error('Failed to extract text');
    }
  } catch (error) {
    statusDiv.className = 'status-message error';
    statusDiv.textContent = `✗ Error: ${error.message}`;
    console.error('Extraction error:', error);
  } finally {
    extractBtn.disabled = false;
  }
}

async function saveToStorage(data) {
  return new Promise((resolve) => {
    chrome.storage.local.get([data.url], (result) => {
      const existingData = result[data.url] || [];
      existingData.push(data);
      chrome.storage.local.set({ [data.url]: existingData }, () => {
        resolve();
      });
    });
  });
}

async function loadCachedPages() {
  const cachedList = document.getElementById('cachedList');
  
  chrome.storage.local.get(null, (items) => {
    const urls = Object.keys(items).filter(key => Array.isArray(items[key]));
    
    if (urls.length === 0) {
      cachedList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-text">No cached pages yet.<br>Extract text from a page to get started.</div>
        </div>
      `;
      return;
    }
    
    cachedList.innerHTML = '';
    
    urls.forEach(url => {
      const pages = items[url];
      const latestPage = pages[pages.length - 1];
      
      const item = document.createElement('div');
      item.className = 'cached-item';
      item.innerHTML = `
        <div class="cached-item-header">
          <div>
            <div class="cached-item-title">${escapeHtml(latestPage.title)}</div>
            <div class="cached-item-meta">
              ${latestPage.wordCount} words • ${formatDate(latestPage.timestamp)}<br>
              <a href="${url}" target="_blank" style="color: #667eea; font-size: 11px;">${truncateUrl(url)}</a>
            </div>
          </div>
          <div class="cached-item-actions">
            <button class="btn-small delete" data-url="${url}">Delete</button>
          </div>
        </div>
      `;
      
      // Delete button handler
      item.querySelector('.delete').addEventListener('click', () => {
        deleteCachedPage(url);
      });
      
      cachedList.appendChild(item);
    });
  });
}

async function deleteCachedPage(url) {
  if (confirm('Delete cached text for this page?')) {
    chrome.storage.local.remove([url], () => {
      loadCachedPages();
      loadSourceUrls(); // Refresh Q&A sources
    });
  }
}

async function clearAllCache() {
  if (confirm('Are you sure you want to clear all cached pages?')) {
    chrome.storage.local.clear(() => {
      loadCachedPages();
      loadSourceUrls();
      showStatus('extractStatus', 'All cache cleared', 'success');
    });
  }
}

async function loadSourceUrls() {
  const sourceSelect = document.getElementById('sourceUrl');
  
  chrome.storage.local.get(null, (items) => {
    const urls = Object.keys(items).filter(key => Array.isArray(items[key]));
    
    sourceSelect.innerHTML = '';
    
    if (urls.length === 0) {
      sourceSelect.innerHTML = '<option value="">No cached pages available</option>';
      return;
    }
    
    urls.forEach(url => {
      const pages = items[url];
      const latestPage = pages[pages.length - 1];
      const option = document.createElement('option');
      option.value = url;
      option.textContent = `${latestPage.title} (${latestPage.wordCount} words)`;
      sourceSelect.appendChild(option);
    });
  });
}

async function askQuestion() {
  const questionInput = document.getElementById('questionInput');
  const sourceUrl = document.getElementById('sourceUrl').value;
  const statusDiv = document.getElementById('qaStatus');
  const answerDiv = document.getElementById('qaAnswer');
  
  const question = questionInput.value.trim();
  
  if (!question) {
    showStatus('qaStatus', 'Please enter a question', 'error');
    return;
  }
  
  if (!sourceUrl) {
    showStatus('qaStatus', 'Please select a source page', 'error');
    return;
  }
  
  // Get cached text
  chrome.storage.local.get([sourceUrl], async (result) => {
    const pages = result[sourceUrl];
    if (!pages || pages.length === 0) {
      showStatus('qaStatus', 'No cached text found for this page', 'error');
      return;
    }
    
    const latestPage = pages[pages.length - 1];
    const text = latestPage.text;
    
    statusDiv.className = 'status-message info';
    statusDiv.textContent = 'Processing your question...';
    statusDiv.style.display = 'block';
    
    answerDiv.classList.remove('show');
    
    try {
      // Use a simple text-based Q&A (can be enhanced with AI API)
      const answer = await answerQuestion(question, text);
      
      answerDiv.textContent = answer;
      answerDiv.classList.add('show');
      
      statusDiv.className = 'status-message success';
      statusDiv.textContent = 'Answer generated successfully';
    } catch (error) {
      statusDiv.className = 'status-message error';
      statusDiv.textContent = `Error: ${error.message}`;
      console.error('Q&A error:', error);
    }
  });
}

async function answerQuestion(question, contextText) {
  // Get API configuration
  const config = await getOllamaConfig();
  
  if (!config.endpoint) {
    throw new Error('API settings not configured. Please go to Settings tab and configure your API endpoint.');
  }

  // Truncate context if too long (keep last 8000 chars to preserve end of document)
  const maxContextLength = 8000;
  const truncatedContext = contextText.length > maxContextLength 
    ? '...' + contextText.substring(contextText.length - maxContextLength)
    : contextText;

  try {
    // Call API through background script to avoid CORS issues
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'callOllama',
        data: {
          endpoint: config.endpoint,
          text: truncatedContext,
          question: question
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Unknown error occurred'));
        }
      });
    });

    return response.response;
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('Cannot connect')) {
      throw new Error('Cannot connect to the API server. Make sure your server is running and the endpoint is correct.');
    }
    throw error;
  }
}

function showStatus(elementId, message, type) {
  const statusDiv = document.getElementById(elementId);
  statusDiv.className = `status-message ${type}`;
  statusDiv.textContent = message;
  statusDiv.style.display = 'block';
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function truncateUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname + urlObj.pathname.substring(0, 30);
  } catch {
    return url.substring(0, 50);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Ollama Configuration Functions
async function getOllamaConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['ollamaEndpoint', 'ollamaModel'], (result) => {
      resolve({
        endpoint: result.ollamaEndpoint || 'http://localhost:8081/v1/analyze',
        model: result.ollamaModel || '' // Model field not used with custom server
      });
    });
  });
}

async function saveOllamaSettings() {
  const endpoint = document.getElementById('ollamaEndpoint').value.trim();
  const model = document.getElementById('ollamaModel').value.trim();
  const statusDiv = document.getElementById('settingsStatus');

  if (!endpoint) {
    showStatus('settingsStatus', 'Please enter an endpoint', 'error');
    return;
  }

  try {
    // Validate URL format
    new URL(endpoint);
    
    chrome.storage.local.set({
      ollamaEndpoint: endpoint,
      ollamaModel: model
    }, () => {
      showStatus('settingsStatus', 'Settings saved successfully!', 'success');
    });
  } catch (error) {
    showStatus('settingsStatus', 'Invalid endpoint URL. Please enter a valid URL.', 'error');
  }
}

async function loadOllamaSettings() {
  const config = await getOllamaConfig();
  document.getElementById('ollamaEndpoint').value = config.endpoint;
  document.getElementById('ollamaModel').value = config.model;
}

async function testOllamaConnection() {
  const statusDiv = document.getElementById('settingsStatus');
  const endpoint = document.getElementById('ollamaEndpoint').value.trim();
  const model = document.getElementById('ollamaModel').value.trim();

  if (!endpoint) {
    showStatus('settingsStatus', 'Please enter an endpoint', 'error');
    return;
  }

  statusDiv.className = 'status-message info';
  statusDiv.textContent = 'Testing connection...';
  statusDiv.style.display = 'block';

  try {
    // Call API through background script to avoid CORS issues
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'testOllamaConnection',
        data: {
          endpoint: endpoint
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Unknown error occurred'));
        }
      });
    });

    statusDiv.className = 'status-message success';
    statusDiv.textContent = response.message || `✓ Connection successful! API server is responding.`;
  } catch (error) {
    statusDiv.className = 'status-message error';
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('Cannot connect')) {
      statusDiv.textContent = '✗ Cannot connect to the API server. Make sure your server is running and the endpoint is correct.';
    } else {
      statusDiv.textContent = `✗ ${error.message}`;
    }
  }
}

