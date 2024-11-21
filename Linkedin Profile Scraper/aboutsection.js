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
               '--single-process',
               '--disable-gpu'
            ],
        headless: true,
        defaultViewport: null,
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

        // Navigate with comprehensive options
        const response = await page.goto(profileLink, {
            waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
            timeout: 60000
        });

        // Advanced page readiness check
        await page.evaluate(() => {
            return new Promise((resolve) => {
                // Wait for potential dynamic content
                setTimeout(resolve, 10000);
            });
        });

        // Log full page HTML content
        const fullPageHtml = await page.content();
        console.log('FULL PAGE HTML CONTENT:');
        console.log(fullPageHtml);

        // Log sections to help identify About and Experience sections
        const sectionTypes = await page.evaluate(() => {
            const sections = document.querySelectorAll('section');
            return Array.from(sections).map((section, index) => {
                // Log section attributes and some inner text
                return {
                    index,
                    id: section.id,
                    className: section.className,
                    dataSection: section.getAttribute('data-section'),
                    innerText: section.innerText.substring(0, 200) // First 200 chars
                };
            });
        });

        console.log('SECTIONS FOUND:');
        console.log(JSON.stringify(sectionTypes, null, 2));

        // Log specific potential About section content
        const aboutSections = await page.evaluate(() => {
            const aboutSelectors = [
                'section.core-section-container.summary',
                'section[data-section="about"]',
                'div.about-section',
                '#about-section'
            ];

            return aboutSelectors.map(selector => {
                const section = document.querySelector(selector);
                return section ? {
                    selector,
                    html: section.innerHTML,
                    text: section.innerText
                } : null;
            }).filter(Boolean);
        });

        console.log('POTENTIAL ABOUT SECTIONS:');
        console.log(JSON.stringify(aboutSections, null, 2));

        await browser.close();

        return {
            'FullPageHtml': fullPageHtml,
            'Sections': sectionTypes,
            'AboutSections': aboutSections,
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
                    console.log(`Successfully processed: ${url}`);
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
