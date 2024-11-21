const puppeteer = require('puppeteer');
const fs = require('fs');

function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time);
    });
}

async function getProfileData(profileLink) {
    const browser = await puppeteer.launch({
        args: ['--start-maximized', '--incognito', '--no-sandbox', 
               '--disable-setuid-sandbox', 
               '--disable-dev-shm-usage',
               '--disable-accelerated-2d-canvas',
               '--no-first-run',
               '--no-zygote',
               '--single-process', // Recommended for some environments
               '--disable-gpu'
            ],
        headless: true,
        defaultViewport: null,
        // Optional: proxy configuration
        // browserWSEndpoint: `ws://${proxyIP}:${proxyPort}`
    });

    const page = (await browser.pages())[0];

    // Sophisticated browser fingerprint management
    await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Dest': 'document',
    });

    // Disable unnecessary resource types
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        const resourceType = request.resourceType();
        const blockedTypes = ['image', 'media', 'font', 'stylesheet'];
        
        if (blockedTypes.includes(resourceType)) {
            request.abort();
        } else {
            request.continue();
        }
    });

    try {
        console.log(`Starting profile data extraction for: ${profileLink}`);

        // Configure extended navigation timeout
        await page.setDefaultNavigationTimeout(60000);

        // Capture and log all network responses
        const responseLogger = async (response) => {
            try {
                if (response.url().includes('linkedin.com')) {
                    console.log(`Response URL: ${response.url()}`);
                    console.log(`Response Status: ${response.status()}`);

                    // Attempt to log response text for debugging
                    try {
                        const text = await response.text();
                        fs.writeFileSync(`debug_response_${Date.now()}.html`, text);
                        console.log('Response text logged');
                    } catch (textError) {
                        console.log('Could not read response text:', textError);
                    }
                }
            } catch (logError) {
                console.log('Error in response logging:', logError);
            }
        };
        page.on('response', responseLogger);

        // Navigate with comprehensive options
        const response = await page.goto(profileLink, {
            waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
            timeout: 60000
        });

        // Comprehensive page load verification
        console.log(`Navigation Status: ${response ? response.status() : 'No response'}`);

        // Advanced page readiness check
        await page.evaluate(() => {
            return new Promise((resolve) => {
                // Wait for potential dynamic content
                setTimeout(resolve, 10000);
            });
        });

        // Capture full page content for debugging
        const pageContent = await page.content();
        console.log('Page Content Length:', pageContent.length);
        fs.writeFileSync('full_page_debug.html', pageContent);

        // Check for potential blocking indicators
        const bodyText = await page.evaluate(() => document.body.innerText);
        console.log('Body Text Preview:', bodyText.substring(0, 1000));

        // Multiple selector strategies
        const nameSelectors = [
            'h1.top-card-layout__title',
            'h1[data-test-selector="profile-name"]',
            'div.text-heading-xlarge',
            'h1.text-heading-xlarge'
        ];

        let name = 'N/A';
        for (const selector of nameSelectors) {
            try {
                name = await page.$eval(selector, el => el.textContent.trim());
                if (name) break;
            } catch {}
        }

        // Enhanced error handling and logging
        const safeExtract = async (selector, context = page, defaultValue = 'N/A') => {
            try {
                return await context.$eval(selector, el => el.textContent.trim());
            } catch {
                console.log(`Selector failed: ${selector}`);
                return defaultValue;
            }
        };

        // Headline extraction
        const headline = await safeExtract('h2.top-card-layout__headline');
        const location = await safeExtract('div.profile-info-subheader div.not-first-middot > span');

        // Log extracted basic info
        console.log('Extracted Profile Info:');
        console.log('Name:', name);
        console.log('Headline:', headline);
        console.log('Location:', location);

        await browser.close();

        return {
            'Name': name,
            'Headline': headline,
            'Location': location,
            'ProfileLink': profileLink
        };

    } catch (error) {
        console.error('Comprehensive Extraction Error:');
        console.error('Error Message:', error.message);
        console.error('Error Stack:', error.stack);
        
        // Save detailed error log
        fs.writeFileSync(`debug_error_${Date.now()}.log`, 
            `Profile: ${profileLink}\n` +
            `Error Message: ${error.message}\n` +
            `Error Stack: ${error.stack}`
        );

        await browser.close();
        return null;
    }
}

(async () => {
    try {
        // Fetch URLs from Google Script
        const response = await fetch('https://script.google.com/macros/s/AKfycbw6iVcHzvAjGAwuiOYWnRiZQaMxxKeiF0_23F3K9eDTAB32ZWwxjAr5-4ozMlKqVlYieA/exec');
        const urls = await response.json();
        console.log(`Total URLs to process: ${urls.length}`);

        let result = {};

        // Process URLs with extensive error handling
        for (const [index, url] of urls.entries()) {
            console.log(`Processing URL ${index + 1}/${urls.length}: ${url}`);
            
            try {
                const profileData = await getProfileData(url);
                
                if (profileData) {
                    result[url] = profileData;
                    console.log(`Successfully processed: ${profileData.Name}`);
                } else {
                    console.log(`Failed to process: ${url}`);
                }

                // Random delay to mimic human behavior
                await delay(Math.floor(Math.random() * 3000) + 2000);
            } catch (processingError) {
                console.error(`Error processing ${url}:`, processingError);
            }
        }

        // Optional: Send results back to Google Script
        try {
            const payload = JSON.stringify({ 'data': result });
            const postResponse = await fetch("https://script.google.com/macros/s/AKfycbykhEXZEg-144m8Fje9-O88N_pIch9P91xEfdeSMRQOTgdlfQBZ8zg0mw91XqTImsto/exec", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
            });

            if (!postResponse.ok) {
                throw new Error(`HTTP error! Status: ${postResponse.status}`);
            }
            console.log('Data successfully sent to Google Script');
        } catch (sendError) {
            console.error('Error sending data:', sendError);
        }

    } catch (mainError) {
        console.error('Main Process Error:', mainError);
    }
})();
