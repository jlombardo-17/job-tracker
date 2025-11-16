# Scraper Architecture

## Overview

The job-tracker uses an **inheritance-based architecture** for web scrapers, making it simple to add new job sources. Each scraper extends a base class that provides common functionality like retry logic, date parsing, and validation.

## Architecture Components

```
BaseScraper (Abstract)
├── UruguayXXIScraper
├── BuscoJobsScraper
├── CompuTrabajoScraper
├── LinkedInScraper
└── [Your Custom Scraper]
```

### Key Components

1. **BaseScraper** (`src/scrapers/BaseScraper.js`)
   - Abstract base class with common scraping functionality
   - Provides: retry logic, date parsing, URL normalization, validation
   - Must implement: `scrape()` method

2. **Specific Scrapers** (`src/scrapers/*Scraper.js`)
   - Extend BaseScraper
   - Implement site-specific scraping logic
   - Return array of job objects

3. **ScraperFactory** (`src/scrapers/ScraperFactory.js`)
   - Creates scraper instances based on source ID
   - Manages scraper registry
   - Supports dynamic registration

4. **ScraperService** (`src/services/ScraperService.js`)
   - Orchestrates scraping operations
   - Saves jobs to database
   - Logs scraping results

## Adding a New Scraper

### Step 1: Create Scraper Class

Create a new file in `src/scrapers/` extending `BaseScraper`:

```javascript
// src/scrapers/YourSiteScraper.js
import BaseScraper from './BaseScraper.js';
import * as cheerio from 'cheerio';

class YourSiteScraper extends BaseScraper {
  /**
   * Scrape job listings from your site
   * @returns {Promise<Array>} Array of job objects
   */
  async scrape() {
    this.log('Fetching job listings...');
    
    const jobs = [];
    
    try {
      // Fetch page with automatic retry
      const html = await this.fetchWithRetry(this.source.url);
      const $ = cheerio.load(html);
      
      // Extract jobs
      $('.job-card').each((i, elem) => {
        const job = this.extractJob($, elem);
        if (job) {
          jobs.push(job);
        }
      });
      
      this.log(`Found ${jobs.length} jobs`, 'success');
      
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
    }
    
    return jobs;
  }

  /**
   * Extract job data from element
   * @param {CheerioStatic} $ - Cheerio instance
   * @param {CheerioElement} elem - Job card element
   * @returns {object|null} Job object or null
   */
  extractJob($, elem) {
    try {
      const $elem = $(elem);
      
      const title = this.cleanText($elem.find('.title').text());
      if (!title) return null;
      
      const company = this.cleanText($elem.find('.company').text());
      const location = this.cleanText($elem.find('.location').text()) || 'Uruguay';
      const description = this.cleanText($elem.find('.description').text(), 1000);
      
      const link = $elem.find('a').attr('href');
      const url = this.normalizeUrl(link, 'https://yoursite.com');
      
      const dateText = $elem.find('.date').text();
      const posted_date = this.parseDate(dateText);
      
      const external_id = `yoursite-${this.generateHash(url)}`;
      
      const job = {
        external_id,
        title,
        company,
        location,
        description,
        url,
        posted_date,
        category: 'general'
      };
      
      return this.validateJob(job) ? job : null;
      
    } catch (error) {
      this.log(`Error extracting job: ${error.message}`, 'warn');
      return null;
    }
  }
}

export default YourSiteScraper;
```

### Step 2: Register in Factory

Add your scraper to the factory registry:

```javascript
// src/scrapers/ScraperFactory.js
import YourSiteScraper from './YourSiteScraper.js';

class ScraperFactory {
  static scrapers = {
    'uruguay-xxi': UruguayXXIScraper,
    'buscojobs': BuscoJobsScraper,
    'computrabajo': CompuTrabajoScraper,
    'linkedin': LinkedInScraper,
    'yoursite': YourSiteScraper,  // ← Add here
  };
  // ...
}
```

### Step 3: Add Source to Configuration

Add the source to `config/sources.json`:

```json
{
  "id": "yoursite",
  "name": "Your Site Name",
  "url": "https://yoursite.com/jobs",
  "enabled": true,
  "type": "job_board"
}
```

### Step 4: Add Source to Database

```sql
INSERT INTO sources (id, name, url, enabled, type) VALUES 
('yoursite', 'Your Site Name', 'https://yoursite.com/jobs', 1, 'job_board');
```

### Step 5: Test Your Scraper

Run the scraper manually:

```bash
node scripts/run-scraper.js
```

## BaseScraper API

### Methods You Can Use

#### `fetchWithRetry(url, options)`
Fetch URL with automatic retry and exponential backoff.

```javascript
const html = await this.fetchWithRetry('https://example.com');
```

#### `parseDate(dateText)`
Parse various date formats (relative, DD/MM/YYYY, ISO).

```javascript
const date = this.parseDate('hace 2 días');  // → '2025-11-13'
const date2 = this.parseDate('15/11/2025');   // → '2025-11-15'
```

#### `generateHash(str)`
Generate consistent hash for external IDs.

```javascript
const id = `mysite-${this.generateHash(url)}`;
```

#### `normalizeUrl(url, baseUrl)`
Convert relative URLs to absolute.

```javascript
const absolute = this.normalizeUrl('/jobs/123', 'https://example.com');
// → 'https://example.com/jobs/123'
```

#### `cleanText(text, maxLength)`
Normalize whitespace and limit length.

```javascript
const clean = this.cleanText('  Too   much   space  ', 50);
```

#### `validateJob(job)`
Validate job object has required fields.

```javascript
if (this.validateJob(job)) {
  jobs.push(job);
}
```

#### `log(message, level)`
Log with colored emoji prefixes.

```javascript
this.log('Starting scrape...');           // ℹ️
this.log('Found 10 jobs', 'success');     // ✅
this.log('No jobs found', 'warn');        // ⚠️
this.log('Failed to fetch', 'error');     // ❌
```

### Configuration Access

Access scraper configuration:

```javascript
this.config.maxRetries    // Number of retry attempts (default: 3)
this.config.retryDelay    // Initial retry delay in ms (default: 3000)
this.config.timeout       // Request timeout in ms (default: 30000)
this.config.userAgent     // User agent string
```

Access source information:

```javascript
this.source.id      // Source ID (e.g., 'yoursite')
this.source.name    // Source name (e.g., 'Your Site')
this.source.url     // Source URL
```

## Job Object Structure

Each scraper should return jobs with this structure:

```javascript
{
  external_id: 'string',      // Required: Unique ID (use hash)
  title: 'string',            // Required: Job title
  company: 'string',          // Required: Company name
  location: 'string',         // Required: Job location
  description: 'string',      // Required: Job description
  url: 'string',              // Required: Full URL to job
  posted_date: 'YYYY-MM-DD',  // Required: When job was posted
  closing_date: 'YYYY-MM-DD', // Optional: Application deadline
  salary: 'string',           // Optional: Salary info
  job_type: 'string',         // Optional: Full-time, Part-time, etc.
  category: 'string',         // Optional: Job category
  requirements: 'string'      // Optional: Job requirements
}
```

## Best Practices

### 1. Use URL-based External IDs

More stable than title-based:

```javascript
const external_id = `prefix-${this.generateHash(url)}`;
```

### 2. Handle Errors Gracefully

```javascript
try {
  const job = extractJob($, elem);
  if (job) jobs.push(job);
} catch (error) {
  this.log(`Error: ${error.message}`, 'warn');
  // Continue with next job
}
```

### 3. Validate Before Adding

```javascript
const job = { /* ... */ };
if (this.validateJob(job)) {
  jobs.push(job);
}
```

### 4. Clean Text Content

```javascript
const title = this.cleanText($elem.find('.title').text());
```

### 5. Use Retry for Network Requests

```javascript
const html = await this.fetchWithRetry(url);
```

## Testing Your Scraper

1. **Unit Test**: Test extractJob() method
2. **Manual Run**: `node scripts/run-scraper.js`
3. **Check Database**: Verify jobs were saved correctly
4. **Check Logs**: Review scraping logs for errors

## Example: Complete Scraper

See `src/scrapers/UruguayXXIScraper.js` for a complete example with:
- Multiple extraction strategies
- Date extraction from titles
- Fallback generic selector approach
- Error handling
- Logging

## Troubleshooting

### No Jobs Found
- Check CSS selectors match actual HTML
- Verify website structure hasn't changed
- Test URL is accessible
- Check for anti-scraping measures

### Duplicate Jobs
- Ensure external_id is based on URL, not title
- Check hash function is working
- Verify URL normalization

### Date Parsing Issues
- Log raw date text to see format
- Add new format to `parseDate()` if needed
- Use fallback to current date

## Dynamic Registration

You can also register scrapers at runtime:

```javascript
import ScraperFactory from './ScraperFactory.js';
import MyCustomScraper from './MyCustomScraper.js';

ScraperFactory.register('mysite', MyCustomScraper);
```

This allows for plugin-based architecture where scrapers can be loaded dynamically.
