const puppeteer = require('puppeteer');
const fs = require('fs');

function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time);
    });
}

async function getProfileData(profileLink) {
    const browser = await puppeteer.launch({
        args: ['--start-maximized', '--incognito', '--no-sandbox', '--disable-web-security'],
        headless: true,
        defaultViewport: null,
        // Uncomment and configure if using a proxy
        // browserWSEndpoint: `ws://${proxyServer}:${proxyPort}`
    });
    const page = (await browser.pages())[0];

    // Optional: Add additional headers to mimic a real browser
    await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
    });

    let [name, headline, location, about, experience, education, licensesCertifications, publications, languages, services, awards] = Array(11).fill('N/A');

    try {
        console.log(`Attempting to navigate to: ${profileLink}`);

        // Enhanced navigation settings
        await page.setDefaultNavigationTimeout(45000);
        
        // Optional: Add authentication if required
        // await page.authenticate({
        //     username: 'your_linkedin_username',
        //     password: 'your_linkedin_password'
        // });

        // Detailed network interception for debugging
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            // Optional: Log or modify requests
            // console.log(`Intercepted Request: ${request.url()}`);
            request.continue();
        });

        // Navigate to the page
        const response = await page.goto(profileLink, { 
            waitUntil: 'networkidle2',
            timeout: 45000 
        });

        // Extensive logging
        console.log(`Page Status: ${response ? response.status() : 'No response'}`);

        // Wait for page to load completely
        await page.waitForTimeout(5000);

        // Check page content
        const pageContent = await page.content();
        console.log('Page Content Length:', pageContent.length);

        // Optional: Save page content for debugging
        fs.writeFileSync('debug_page_content.html', pageContent);

        // Try multiple selectors in case of changes
        const nameSelectors = [
            'h1.top-card-layout__title.font-sans.text-lg.papabear\\:text-xl.font-bold.leading-open.text-color-text.mb-0',
            'h1[data-test-selector="profile-name"]',
            'div.text-heading-xlarge'
        ];

        // Name Extraction
        for (const selector of nameSelectors) {
            try {
                name = await page.$eval(selector, el => el.textContent.trim());
                if (name) break;
            } catch (err) {
                console.log(`Selector ${selector} failed`);
            }
        }

        // Similar approach for other extractions
        try {
            headline = await page.$eval('h2.top-card-layout__headline.break-words.font-sans.text-md.leading-open.text-color-text', 
                el => el.textContent.trim());
        } catch (err) {
            console.log('Headline extraction failed');
        }

        // Location Extraction
        try {
            location = await page.$eval('div.profile-info-subheader div.not-first-middot > span', 
                el => el.textContent.trim());
        } catch (err) {
            console.log('Location extraction failed');
        }

        // About Section Extraction
        try {
            about = await page.$$eval('section.core-section-container.core-section-container--with-border.border-b-1.border-solid.border-color-border-faint.py-4.pp-section.summary p', 
                elements => elements.map(el => el.textContent.trim()).join(' '));
        } catch (err) {
            console.log('About section extraction failed');
        }

        // Experience Extraction
        try {
            experience = await page.$$eval('section[data-section="experience"] ul.experience__list li', elements => 
                elements.map(el => {
                    const title = el.querySelector('.experience-item__title')?.textContent.trim() || 'N/A';
                    const company = el.querySelector('.experience-item__subtitle')?.textContent.trim() || 'N/A';
                    const dateRange = el.querySelector('.date-range time')?.textContent.trim() || 'N/A';
                    const duration = el.querySelector('.date-range .before\\:middot')?.textContent.trim() || '';
                    const location = el.querySelector('.experience-item__meta-item:nth-of-type(2)')?.textContent.trim() || 'N/A';

                    return `${title}\n${company}\n${dateRange} (${duration})\n${location}`;
                }).join('\n\n'));
        } catch (err) {
            console.log('Experience extraction failed');
        }

        // Similar error-handled extraction for other sections...
        
        await browser.close();

        return {
            'Name': name,
            'HeadLine': headline,
            'Location': location,
            'About': about,
            'Experience': experience,
            // Add other sections similarly
        };
    } catch (error) {
        console.error('Comprehensive Error Logging:');
        console.error('Error Message:', error.message);
        console.error('Error Stack:', error.stack);
        
        // Optional: Save error details
        fs.writeFileSync('debug_error_log.txt', `Error on ${profileLink}\n${error.message}\n${error.stack}`);
        
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

        // Process each URL with enhanced error handling
        for (const [index, url] of urls.entries()) {
            console.log(`Processing URL ${index + 1}/${urls.length}: ${url}`);
            
            let profileData = {
                'Name': 'N/A',
                'HeadLine':'N/A',
                'Location': 'N/A',
                'About': 'N/A',
                'Experience': 'N/A'
            };

            try {
                profileData = await getProfileData(url);
                console.log(`Processed Profile: ${profileData ? profileData.Name : 'Failed'}`);

                if (profileData != null) {
                    result[url] = profileData;
                }
                
                // Delay between requests to avoid rate limiting
                await delay(Math.floor(Math.random() * 3000) + 2000);
            } catch (error) {
                console.error(`Error processing ${url}:`, error);
            }
        }

        // Send results back to Google Script
        try {
            const payload = JSON.stringify({
                'data': result,
            });
            const response = await fetch("https://script.google.com/macros/s/AKfycbykhEXZEg-144m8Fje9-O88N_pIch9P91xEfdeSMRQOTgdlfQBZ8zg0mw91XqTImsto/exec", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: payload,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            console.log('Data successfully sent to Google Script');
        } catch (error) {
            console.error('Error sending data:', error);
        }
    } catch (error) {
        console.error('Main Process Error:', error);
    }
})();
