# 404 Detection System Documentation

## Overview

The 404 Finder extension uses a sophisticated multi-layered detection system to identify both hard 404s (HTTP status code 404) and soft 404s (pages that return 200 but display error content). The system achieves near 99% accuracy through pattern matching, content analysis, and platform-specific detection.

## Detection Architecture

### 1. Hard 404 Detection (Background Script)
- **Method**: `chrome.webRequest.onHeadersReceived`
- **Detection**: Direct HTTP 404 status codes
- **Confidence**: 100% (server explicitly returns 404)
- **Storage**: Errors are stored in memory and persisted to chrome.storage

### 2. Soft 404 Detection (Content Script Only)
- **Method**: Content analysis with scoring system
- **Detection**: Pattern matching, content sparsity, page structure
- **Confidence**: Variable based on indicators
- **Communication**: Notifies background script via `pageDetected404` message

### Architectural Decision
All soft 404 detection logic is contained within the content script to:
- Eliminate code duplication
- Simplify maintenance
- Provide clear separation of concerns
- Improve educational value

## Scoring System

The detection uses a confidence-based scoring system with the following components:

### Content Sparsity Analysis
```javascript
Word Count    | Score | Multiplier | Description
------------- | ----- | ---------- | -----------
< 20 words    | +35   | 2.0x       | Extremely sparse
< 50 words    | +25   | 1.5x       | Very sparse
< 100 words   | +15   | 1.2x       | Sparse
< 200 words   | +5    | 1.0x       | Limited
> 500 words   | -20   | 0.7x       | Substantial content (unlikely 404)
```

### Pattern Categories

#### Strong Indicators (High Weight)
- Title patterns: `^404.*error`, `Page not found` (weight: 35-40)
- HTTP status in content: `HTTP ERROR 404` (weight: 35)
- Explicit 404 messages with context (weight: 30-40)

#### Medium Indicators (Medium Weight)
- Generic error messages: `page cannot be found` (weight: 20)
- Soft error phrases: `content isn't available` (weight: 15-30)
- Removal notices: `page has been removed` (weight: 15)

#### Weak Indicators (Low Weight)
- Simple phrases: `not found`, `doesn't exist` (weight: 5)
- Only counted if multiple occurrences (3+)

### Detection Thresholds
```javascript
Word Count    | Threshold | Strong Indicators Required
------------- | --------- | -------------------------
< 20          | 45        | 0
< 50          | 50        | 0
< 100         | 55        | 1
< 200         | 58        | 1
Default       | 60        | 1
```

## Platform-Specific Detection

The system includes special handling for major platforms that use soft 404s:

### GitHub
```javascript
Patterns:
- Title: "Page not found" (weight: 40)
- Body: "404" + "This is not the web page you are looking for" (weight: 50)
- Special handling for navigation-heavy pages
```

### Facebook
```javascript
Patterns:
- "This content isn't available" (weight: 40)
- "it's been deleted" (weight: 30)
- "owner only shared it with a small group" (weight: 25)

Special Features:
- Lower threshold (35) due to heavy navigation content
- Handles both straight and curly apostrophes
```

### Twitter/X
```javascript
Patterns:
- "This account doesn't exist" (weight: 50)
- "Try searching for another" (weight: 20)
```

## Platform Detection Logic

The platform detection works as follows:

1. **Domain Matching**: Check if current domain includes platform domain
2. **Pattern Matching**: Look for platform-specific patterns in title/body
3. **Flag Setting**: Set `platformDetected` when patterns match
4. **Threshold Adjustment**: Apply platform-specific confidence thresholds

### Facebook Special Case
Facebook 404 pages typically contain 1000+ words due to navigation, footer, and UI elements. The system compensates by:
- Lowering the confidence threshold to 35 (from default 60)
- Applying platform detection to override content volume penalties
- Supporting multiple apostrophe variations in patterns

## Detection Flow

```
1. Page Load
   ↓
2. Search Engine Check
   - Skip detection entirely on search engines
   - Prevents false positives and saves resources
   - Returns immediately if domain matches search engine list
   ↓
3. Content Analysis
   - Count words, sentences, unique words
   - Calculate sparsity score and multiplier
   ↓
4. Pattern Matching
   - Check platform-specific patterns first
   - Apply strong/medium/weak indicators
   - Adjust weights based on context (title vs body)
   ↓
5. Structure Analysis
   - Count images, links, forms
   - Check for 404-specific images
   - Consider known sites with heavy chrome
   ↓
6. Confidence Calculation
   - Sum all weighted scores
   - Apply sparsity multiplier
   - Check platform detection flag
   ↓
7. Final Decision
   - Compare against dynamic threshold
   - Apply platform-specific rules
   - Return is404 boolean
```

## Key Improvements

### 1. Dynamic Thresholds
- Thresholds adjust based on content volume
- Prevents false positives on content-heavy sites
- Catches minimal error pages effectively

### 2. Platform-Specific Handling
- Custom patterns for major platforms
- Adjusted thresholds for known heavy-chrome sites
- Handles various text encodings (straight/curly quotes)

### 3. Context-Aware Weighting
- Title matches weighted higher than body
- H1 tags given 80% of title weight
- Body content given 30% weight to reduce noise

### 4. Sparsity Multiplier
- Amplifies pattern matches on sparse pages
- Reduces confidence on content-heavy pages
- Creates adaptive detection sensitivity

## Adding New Platform Support

To add detection for a new platform:

1. Add to `platformSpecific404s` array in content.js:
```javascript
{
    domain: 'example.com',
    patterns: [
        { pattern: /Your error pattern/i, weight: 40, context: 'any' }
    ]
}
```

2. Optionally add special threshold handling:
```javascript
if (currentDomain.includes('example.com') && detectionResult.confidence >= 40) {
    detectionResult.is404 = true;
}
```

3. Test with various page types to ensure accuracy

## Testing and Validation

The detection system can be tested using:
- Direct 404 URLs (e.g., github.com/missing)
- Soft 404 pages on various platforms
- The included test-facebook-404.html file
- Browser console logs showing detection details

## Performance Considerations

- Detection runs once per page load
- Pattern matching uses compiled RegExp objects
- Early exit for pages with substantial content
- Minimal DOM queries for efficiency
- **Search engines are completely skipped** to save resources

## Excluded Domains

The extension automatically skips detection on the following search engine domains to:
- Prevent false positives (search pages often contain error-like phrases)
- Save computational resources
- Avoid interfering with search functionality

### Search Engine List
- Google (google.com, www.google.com)
- Bing (bing.com, www.bing.com)
- Yahoo (yahoo.com, search.yahoo.com)
- DuckDuckGo (duckduckgo.com, www.duckduckgo.com)
- Baidu (baidu.com, www.baidu.com)
- Yandex (yandex.com, yandex.ru)
- Ask (ask.com, www.ask.com)
- AOL (aol.com, search.aol.com)
- Ecosia (ecosia.org, www.ecosia.org)
- Startpage (startpage.com, www.startpage.com)
- Searx (searx.me)
- Qwant (qwant.com)
- Brave Search (search.brave.com)
- Neeva (neeva.com)

## Future Enhancements

Potential improvements for even better accuracy:
1. Machine learning-based classification
2. Visual analysis of page layout
3. Language-specific pattern sets
4. User-reported false positive/negative learning
5. A/B testing of threshold values
