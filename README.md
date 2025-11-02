# Web Text Extractor & Q&A Chrome Extension

A Chrome extension that extracts text from any webpage, stores it in cache, and allows users to ask questions about the extracted text.

## Features

- **Text Extraction**: Extract clean text content from any webpage, automatically removing navigation, ads, and other unwanted elements
- **Caching**: Store extracted text in Chrome's local storage for later reference
- **Q&A System**: Ask questions about the cached text and get relevant answers
- **Modern UI**: Clean, intuitive interface with tabbed navigation

## Installation

1. **Download or clone this repository**
   ```bash
   git clone <repository-url>
   cd chrome-extension-text-extractor
   ```

2. **Load the extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select the `chrome-extension-text-extractor` folder

3. **Add Extension Icon** (Optional)
   - Create an `icons` folder in the project directory
   - Add icon files: `icon16.png`, `icon48.png`, `icon128.png`
   - If icons are not available, the extension will still work but may show a default icon

## Usage

1. **Extract Text**
   - Navigate to any webpage
   - Click the extension icon in Chrome's toolbar
   - Click "Extract Text from Current Page"
   - View a preview of the extracted text

2. **View Cached Pages**
   - Open the extension popup
   - Click the "Cached" tab
   - See all pages you've extracted text from
   - Delete individual cached pages or clear all

3. **Ask Questions**
   - Open the extension popup
   - Click the "Q&A" tab
   - Select a source page from the dropdown
   - Type your question and click "Ask Question"
   - Get answers based on the extracted text

## File Structure

```
chrome-extension-text-extractor/
├── manifest.json       # Extension configuration
├── background.js       # Background service worker
├── content.js          # Content script (runs on web pages)
├── popup.html          # Extension popup UI
├── popup.css           # Styles for popup
├── popup.js            # Popup logic and functionality
├── icons/              # Extension icons (create this folder)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md           # This file
```

## How It Works

### Text Extraction
- Uses Chrome's `scripting.executeScript` API to inject extraction code into the current page
- Intelligently removes unwanted elements (scripts, styles, navigation, ads)
- Focuses on main content areas (article, main, or body)
- Cleans and formats the extracted text

### Caching
- Uses Chrome's `chrome.storage.local` API for persistent storage
- Stores text by URL, allowing multiple extractions from the same page
- Includes metadata: title, timestamp, word count

### Q&A System
- Currently uses a keyword-based matching algorithm
- Finds sentences most relevant to the question
- Can be easily extended to integrate with AI APIs (OpenAI, Claude, etc.)

## Enhancing the Q&A System

To integrate with an AI API (e.g., OpenAI), modify the `answerQuestion` function in `popup.js`:

```javascript
async function answerQuestion(question, contextText) {
  const API_KEY = 'your-api-key'; // Store securely
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that answers questions based on the provided text.'
        },
        {
          role: 'user',
          content: `Context: ${contextText.substring(0, 4000)}\n\nQuestion: ${question}`
        }
      ]
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}
```

## Permissions

The extension requires:
- `activeTab`: To access the current tab's content
- `storage`: To cache extracted text
- `scripting`: To inject extraction scripts
- `<all_urls>`: To work on any webpage

## Browser Compatibility

- Chrome 88+ (Manifest V3)
- Edge 88+ (Chromium-based)
- Other Chromium-based browsers

## Future Enhancements

- [ ] Integration with AI APIs (OpenAI, Claude, etc.)
- [ ] Export cached text to files
- [ ] Search functionality within cached text
- [ ] Text summarization
- [ ] Support for extracting specific sections
- [ ] Batch extraction from multiple tabs
- [ ] Sync across devices (using Chrome sync storage)

## License

MIT License - feel free to modify and use as needed.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

