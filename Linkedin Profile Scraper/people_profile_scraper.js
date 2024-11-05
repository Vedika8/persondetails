const puppeteer = require('puppeteer');

function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time);
    });
}

async function getProfileData(profileLink) {
    const browser = await puppeteer.launch({
        args: ['--start-maximized', '--incognito', '--no-sandbox'],
        headless: true,  // Make sure to use lowercase 'true'
        defaultViewport: null
    });
    const page = (await browser.pages())[0];

    let [name, location, about, experience, education, licensesCertifications, publications, languages, services, awards] = Array(10).fill('N/A');

    await page.goto(profileLink);
    console.log(profileLink);

    try {
        await page.waitForSelector('h1.top-card-layout__title.font-sans.text-lg.papabear\\:text-xl.font-bold.leading-open.text-color-text.mb-0', { timeout: 10000 });
        
        // Extract Name
        name = await page.$eval('h1.top-card-layout__title.font-sans.text-lg.papabear\\:text-xl.font-bold.leading-open.text-color-text.mb-0', el => el.textContent.trim()).catch(() => 'N/A');

        // Extract Location
        location = await page.$eval('div.profile-info-subheader div.not-first-middot > span', el => el.textContent.trim()).catch(() => 'N/A');
        
        // Extract About
        about = await page.$$eval('section.core-section-container.core-section-container--with-border.border-b-1.border-solid.border-color-border-faint.py-4.pp-section.summary p', 
            elements => elements.map(el => el.textContent.trim()).join(' ')).catch(() => 'N/A');

        // Extract Experience
        experience = await page.$$eval('section[data-section="experience"] ul.experience__list li', elements => 
            elements.map(el => {
                const title = el.querySelector('.experience-item__title')?.textContent.trim() || 'N/A';
                const company = el.querySelector('.experience-item__subtitle')?.textContent.trim() || 'N/A';
                const dateRange = el.querySelector('.date-range time')?.textContent.trim() || 'N/A';
                const duration = el.querySelector('.date-range .before\\:middot')?.textContent.trim() || '';
                const location = el.querySelector('.experience-item__meta-item:nth-of-type(2)')?.textContent.trim() || 'N/A';

                return `${title}\n${company}\n${dateRange} ${duration}\n${location}`;
            }).join('\n\n')).catch(() => 'N/A');

        // Extract Education
        // Extract Education
        education = await page.$$eval('section[data-section="educationsDetails"] ul.education__list li', elements => 
            elements.map(el => {
                const university = el.querySelector('h3 a')?.textContent.trim() || 'N/A';
                //const degree = el.querySelector('h4 span.control-transition:nth-of-type(1)')?.textContent.trim() || 'N/A';
                //const fieldOfStudy = el.querySelector('h4 span.control-transition:nth-of-type(2)')?.textContent.trim() || 'N/A';

                return `${university}\n`;
                //${degree}\n${fieldOfStudy}`;
            }).join('\n\n')).catch(() => 'N/A');


        // Extract Licenses & Certifications
        // Extract Certifications
        const certifications = await page.$$eval('section[data-section="certifications"] ul li', elements => 
            elements.map(el => {
                const title = el.querySelector('h3')?.textContent.trim() || 'N/A';
                //const organization = el.querySelector('h4')?.textContent.trim() || 'N/A';
                //const issuedDate = el.querySelector('div.not-first-middot time')?.textContent.trim() || 'N/A';

                return `${title}\n`;
                //${organization}\nIssued: ${issuedDate}`;
            }).join('\n\n')).catch(() => 'N/A');


        // Extract Publications
        const publications = await page.$$eval('section[data-section="publications"] ul li', elements => 
            elements.map(el => {
                const title = el.querySelector('h3')?.textContent.trim() || 'N/A'; // Get the title from h3
                return title; // Only returning the publication title
            }).join(', ')).catch(() => 'N/A');

        // Extract Languages
        languages = await page.$$eval('section[data-section="languages"] ul li', elements => 
            elements.map(el => {
                const language = el.querySelector('h3')?.textContent.trim() || 'N/A';
                return language; // Only returning the language name
            }).join(', ')).catch(() => 'N/A');

        // Extract Services
        const services = await page.$$eval('section[data-section="services"] ul li', elements => 
            elements.map(el => {
                const service = el.querySelector('a')?.textContent.trim() || 'N/A';
                return service; // Only returning the service name
            }).join(', ')).catch(() => 'N/A');

        // Extract Awards
        awards = await page.$$eval('section[data-section="honors-and-awards"] ul.awards__list li', elements => 
            elements.map(el => {
                const title = el.querySelector('h3')?.textContent.trim() || 'N/A';
                return title;
            }).join(', ')).catch(() => 'N/A');

        await browser.close();

        return {
            'Name': name,
            'Location': location,
            'About': about,
            'Experience': experience,
            'Education': education,
            'Licenses & Certifications': certifications,
            'Publications': publications,
            'Languages': languages,
            'Services': services,
            'Awards': awards
        };
    } catch (error) {
        console.log(error.message);
        await browser.close();
        return null;
    }
}

(async () => {
    const response = await fetch('https://script.google.com/macros/s/AKfycbw6iVcHzvAjGAwuiOYWnRiZQaMxxKeiF0_23F3K9eDTAB32ZWwxjAr5-4ozMlKqVlYieA/exec');
    const urls = await response.json();
    console.log(urls.length);

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
            console.log(profileData);

            if (profileData != null) {
                result[url] = profileData;
            }
            await delay(2000);
        } catch (error) {
            console.log(error);
        }
    }

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
    } catch (error) {
        console.error('Error:', error);
    }
})();
