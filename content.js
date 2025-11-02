// Content script to extract text from the current webpage

(function() {
  'use strict';

  let lastSelectedText = '';
  let toastTimeout = null;

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

  // Function to create and show toast notification
  function showToast() {
    // Remove existing toast if any
    const existingToast = document.getElementById('text-extractor-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.id = 'text-extractor-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 350px;
      animation: slideIn 0.3s ease-out;
      cursor: pointer;
    `;

    toast.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        <path d="M8 10h.01M12 10h.01M16 10h.01"></path>
      </svg>
      <div>
        <div style="font-weight: 600; margin-bottom: 4px;">Text Selected!</div>
        <div style="font-size: 12px; opacity: 0.9;">Click extension icon to ask questions</div>
      </div>
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    // Add click handler to close toast when clicked
    toast.addEventListener('click', () => {
      removeToast(toast);
    });

    // Add hover effect
    toast.addEventListener('mouseenter', () => {
      toast.style.transform = 'scale(1.02)';
      toast.style.transition = 'transform 0.2s ease';
    });
    toast.addEventListener('mouseleave', () => {
      toast.style.transform = 'scale(1)';
    });

    document.body.appendChild(toast);

    // Auto-remove after 5 seconds
    toastTimeout = setTimeout(() => {
      removeToast(toast);
    }, 5000);
  }

  // Function to remove toast
  function removeToast(toast) {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
      toastTimeout = null;
    }
    toast.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }

  // Listen for text selection
  document.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    // Only show toast if meaningful text is selected (more than just whitespace)
    if (selectedText.length > 0 && selectedText !== lastSelectedText) {
      lastSelectedText = selectedText;
      // Show toast after a short delay to avoid showing on every small selection
      setTimeout(() => {
        const currentSelection = window.getSelection().toString().trim();
        if (currentSelection === selectedText && currentSelection.length > 0) {
          showToast();
        }
      }, 100);
    }
  });

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

