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
});

