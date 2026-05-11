const { contextBridge } = require('electron')

// Expose minimal API surface to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  backendPort: 8080,
})
