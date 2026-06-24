Set-Location panel-admin
npm run build
Set-Location ..
firebase deploy --only hosting
firebase deploy --only functions
