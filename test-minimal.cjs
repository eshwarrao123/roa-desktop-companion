const { app } = require('electron');
console.log('app:', app);
const gotTheLock = app.requestSingleInstanceLock();
console.log('gotTheLock:', gotTheLock);