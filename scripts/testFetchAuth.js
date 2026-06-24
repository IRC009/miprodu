// scripts/testFetchAuth.js
const fs = require('fs');
const path = require('path');

const userProfile = process.env.USERPROFILE || 'c:\\Users\\IRC009';
const firebaseConfigPath = path.join(userProfile, '.config/configstore/firebase-tools.json');

if (fs.existsSync(firebaseConfigPath)) {
  try {
    const raw = fs.readFileSync(firebaseConfigPath, 'utf8');
    const data = JSON.parse(raw);
    const refreshToken = data?.tokens?.refresh_token;
    
    if (refreshToken) {
      console.log('✅ Found Firebase CLI refresh token.');
      
      const clientId = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
      const clientSecret = 'j9iVZfS8kkCEFUPaAeJV0sAi';
      
      fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      }).then(res => res.json())
        .then(resData => {
          if (resData.access_token) {
            console.log('✅ Access Token retrieved successfully:', resData.access_token.slice(0, 15) + '...');
          } else {
            console.error('❌ Failed to refresh token:', resData);
          }
        });
    } else {
      console.log('❌ No refresh token found.');
    }
  } catch (e) {
    console.error('❌ Error parsing firebase-tools.json:', e);
  }
} else {
  console.log('❌ File does not exist.');
}
