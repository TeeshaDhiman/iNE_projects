const https = require('https');
const fs = require('fs');

https.get('https://demo.inelabteamdev.com/assets/index-B9UiQq4X.js', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        const urls = data.match(/https?:\/\/[^\s"'`]+/g) || [];
        const uniqueUrls = [...new Set(urls)].filter(u => u.includes('inelab') || u.includes('api') || u.includes('supabase'));
        console.log("Found URLs:", uniqueUrls);
        fs.writeFileSync('js_content.js', data);
    });
}).on("error", (err) => {
    console.log("Error: " + err.message);
});
