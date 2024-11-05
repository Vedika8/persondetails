const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time);
    });
}

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)){
    fs.mkdirSync(screenshotsDir);
}

// Function to take and save screenshot
async function takeScreenshot(page, errorType, profileUrl) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const urlHash = Buffer.from(profileUrl).toString('base64').substring(0, 10); // Create a short hash of the URL
    const screenshotPath = path.join(screenshotsDir, `error_${errorType}_${urlHash}_${timestamp}.png`);
    
    try {
        await page.screenshot({
            path: screenshotPath,
            fullPage: true
        });
        console.log(`Screenshot saved: ${screenshotPath}`);
    } catch (screenshotError) {
        console.error('Failed to take screenshot:', screenshotError);
    }
}

async function getProfileData(profileLink) {
    const browser = await puppeteer.launch({
        args: ['--start-maximized', '--incognito', '--no-sandbox'],
        headless: true,  
        defaultViewport: null
    });
    const page = (await browser.pages())[0];

    let [name, location, about, experience, education, licensesCertifications, publications, languages, services, awards] = Array(10).fill('N/A');

    try {
        await page.goto(profileLink);
        await delay(3000);

        console.log(profileLink);

        // Wait for the main content to load
        try {
            await page.waitForSelector('h1.top-card-layout__title.font-sans.text-lg.papabear\\:text-xl.font-bold.leading-open.text-color-text.mb-0', { timeout: 30000 });
        } catch (selectorError) {
            await takeScreenshot(page, 'selector_timeout', profileLink);
            throw selectorError;
        }

        // Extract Name
        try {
            name = await page.$eval('h1.top-card-layout__title.font-sans.text-lg.papabear\\:text-xl.font-bold.leading-open.text-color-text.mb-0', el => el.textContent.trim());
        } catch (error) {
            await takeScreenshot(page, 'name_extraction', profileLink);
            name = 'N/A';
        }

        // Extract Location
        try {
            location = await page.$eval('div.profile-info-subheader div.not-first-middot > span', el => el.textContent.trim());
        } catch (error) {
            location = 'N/A';
        }

        // Extract About
        try {
            about = await page.$$eval('section.core-section-container.core-section-container--with-border.border-b-1.border-solid.border-color-border-faint.py-4.pp-section.summary p', 
                elements => elements.map(el => el.textContent.trim()).join(' '));
        } catch (error) {
            about = 'N/A';
        }

        // Extract Experience
        try {
            experience = await page.$$eval('section[data-section="experience"] ul.experience__list li', elements => 
                elements.map(el => {
                    const title = el.querySelector('.experience-item__title')?.textContent.trim() || 'N/A';
                    const company = el.querySelector('.experience-item__subtitle')?.textContent.trim() || 'N/A';
                    const dateRange = el.querySelector('.date-range time')?.textContent.trim() || 'N/A';
                    const duration = el.querySelector('.date-range .before\\:middot')?.textContent.trim() || '';
                    const location = el.querySelector('.experience-item__meta-item:nth-of-type(2)')?.textContent.trim() || 'N/A';
                    return `${title}\n${company}\n${dateRange} ${duration}\n${location}`;
                }).join('\n\n'));
        } catch (error) {
            await takeScreenshot(page, 'experience_extraction', profileLink);
            experience = 'N/A';
        }

        // Extract Education
        try {
            education = await page.$$eval('section[data-section="educationsDetails"] ul.education__list li', elements => 
                elements.map(el => {
                    const university = el.querySelector('h3 a')?.textContent.trim() || 'N/A';
                    return `${university}`;
                }).join('\n\n'));
        } catch (error) {
            education = 'N/A';
        }

        // Extract Certifications
        try {
            licensesCertifications = await page.$$eval('section[data-section="certifications"] ul li', elements => 
                elements.map(el => {
                    const title = el.querySelector('h3')?.textContent.trim() || 'N/A';
                    return `${title}`;
                }).join('\n\n'));
        } catch (error) {
            licensesCertifications = 'N/A';
        }

        // Extract Publications
        try {
            publications = await page.$$eval('section[data-section="publications"] ul li', elements => 
                elements.map(el => {
                    const title = el.querySelector('h3')?.textContent.trim() || 'N/A';
                    return title;
                }).join(', '));
        } catch (error) {
            publications = 'N/A';
        }

        // Extract Languages
        try {
            languages = await page.$$eval('section[data-section="languages"] ul li', elements => 
                elements.map(el => {
                    const language = el.querySelector('h3')?.textContent.trim() || 'N/A';
                    return language;
                }).join(', '));
        } catch (error) {
            languages = 'N/A';
        }

        // Extract Services
        try {
            services = await page.$$eval('section[data-section="services"] ul li', elements => 
                elements.map(el => {
                    const service = el.querySelector('a')?.textContent.trim() || 'N/A';
                    return service;
                }).join(', '));
        } catch (error) {
            services = 'N/A';
        }

        // Extract Awards
        try {
            awards = await page.$$eval('section[data-section="honors-and-awards"] ul.awards__list li', elements => 
                elements.map(el => {
                    const title = el.querySelector('h3')?.textContent.trim() || 'N/A';
                    return title;
                }).join(', '));
        } catch (error) {
            awards = 'N/A';
        }

        await browser.close();

        return {
            'Name': name,
            'Location': location,
            'About': about,
            'Experience': experience,
            'Education': education,
            'Licenses & Certifications': licensesCertifications,
            'Publications': publications,
            'Languages': languages,
            'Services': services,
            'Awards': awards
        };
    } catch (error) {
        console.log(error.message);
        await takeScreenshot(page, 'general_error', profileLink);
        await browser.close();
        return null;
    }
}

(async () => {
    try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbw6iVcHzvAjGAwuiOYWnRiZQaMxxKeiF0_23F3K9eDTAB32ZWwxjAr5-4ozMlKqVlYieA/exec');
        const urls = await response.json();
        console.log(`Total profiles to process: ${urls.length}`);

        let result = {};

        for (const url of urls) {
            let profileData = {
                'Name': 'N/A',
                'Location': 'N/A',
                'About': 'N/A',
                'Experience': 'N/A',
                'Education': 'N/A',
                'Licenses & Certifications': 'N/A',
                'Publications': 'N/A',
                'Languages': 'N/A',
                'Services': 'N/A',
                'Awards': 'N/A'
            };

            try {
                profileData = await getProfileData(url);
                console.log(`Processed profile: ${url}`);

                if (profileData != null) {
                    result[url] = profileData;
                }
                await delay(2000);
            } catch (error) {
                console.log(`Error processing profile ${url}:`, error);
            }
        }

        // Send results to Google Sheet
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
            console.log('Data successfully sent to Google Sheet');
        } catch (error) {
            console.error('Error sending data to Google Sheet:', error);
        }
    } catch (error) {
        console.error('Fatal error:', error);
    }
})();
