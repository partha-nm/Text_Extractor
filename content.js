// Content script to extract text from the current webpage

(function() {
  'use strict';

  // Function to extract all visible text from the page
  function extractPageText() {
    // Remove script and style elements
    const scripts = document.querySelectorAll('script, style, noscript');
    scripts.forEach(el => el.remove());

    // Get the main content area (prefer article, main, or body)
    let contentElement = document.querySelector('article') || 
                        document.querySelector('main') || 
                        document.body;

    // Clone to avoid modifying the original DOM
    const clone = contentElement.cloneNode(true);

    // Remove unwanted elements
    const unwantedSelectors = [
      'nav', 'header', 'footer', 'aside', 
      '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
      '.ad', '.advertisement', '.ads', '[class*="ad-"]'
    ];
    
    unwantedSelectors.forEach(selector => {
      clone.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Get text content
    const text = clone.innerText || clone.textContent || '';
    
    // Clean up: remove excessive whitespace
    const cleanedText = text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      url: window.location.href,
      title: document.title,
      text: cleanedText,
      timestamp: new Date().toISOString(),
      wordCount: cleanedText.split(/\s+/).filter(word => word.length > 0).length
    };
  }

  // Listen for messages from popup or background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractText') {
      try {
        const extractedData = extractPageText();
        sendResponse({ success: true, data: extractedData });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      return true; // Keep channel open for async response
    }
  });

  // Expose extraction function globally for direct access
  window.extractPageText = extractPageText;
})();

