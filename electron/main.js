const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')
const fs = require('fs')

let mainWindow = null
let backendProcess = null
let nextProcess = null

const isDev = !app.isPackaged
const BACKEND_PORT = 8080
const NEXT_PORT = 3000

// ── Paths (packaged) ───────────────────────────────────────────────────────────
const BACKEND_EXE = path.join(process.resourcesPath, 'backend', 'auditiq_backend.exe')
// Next.js build lives in app root alongside electron main
const APP_ROOT = isDev
  ? path.join(__dirname, '..')
  : path.join(process.resourcesPath, '..', 'app')

// ── Poll until a port responds ─────────────────────────────────────────────────
function waitForPort(port, retries = 60) {
  return new Promise((resolve, reject) => {
    function attempt() {
      const req = http.get(`http://localhost:${port}/`, res => {
        resolve()
      })
      req.on('error', () => {
        if (retries-- <= 0) return reject(new Error(`Port ${port} not ready`))
        setTimeout(attempt, 1000)
      })
      req.setTimeout(1000, () => { req.destroy(); if (retries-- <= 0) reject(new Error(`Port ${port} timeout`)); else setTimeout(attempt, 1000) })
    }
    attempt()
  })
}

// ── Start Python FastAPI backend ───────────────────────────────────────────────
function startBackend() {
  if (isDev) {
    console.log('[electron] Dev mode — assuming backend already running on :8080')
    return Promise.resolve()
  }

  if (!fs.existsSync(BACKEND_EXE)) {
    dialog.showErrorBox('AuditIQ', `Backend executable not found:\n${BACKEND_EXE}`)
    app.quit()
    return Promise.reject(new Error('backend exe missing'))
  }

  return new Promise((resolve, reject) => {
    backendProcess = spawn(BACKEND_EXE, [], {
      cwd: path.dirname(BACKEND_EXE),
      windowsHide: true,
      env: { ...process.env, PORT: String(BACKEND_PORT) },
    })

    backendProcess.stdout.on('data', d => console.log('[backend]', d.toString().trim()))
    backendProcess.stderr.on('data', d => console.error('[backend]', d.toString().trim()))
    backendProcess.on('error', err => { dialog.showErrorBox('Backend Error', err.message); reject(err) })

    // Wait for health endpoint
    const healthCheck = () => {
      http.get(`http://localhost:${BACKEND_PORT}/health`, res => {
        if (res.statusCode === 200) resolve()
        else setTimeout(healthCheck, 1000)
      }).on('error', () => setTimeout(healthCheck, 1000))
    }
    setTimeout(healthCheck, 2000)
  })
}

// ── Start Next.js server ───────────────────────────────────────────────────────
function startNext() {
  if (isDev) {
    console.log('[electron] Dev mode — assuming Next.js already running on :3000')
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const nodeExe = process.execPath  // electron's bundled node
    nextProcess = spawn(nodeExe, ['node_modules/.bin/next', 'start', '-p', String(NEXT_PORT)], {
      cwd: APP_ROOT,
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: `http://localhost:${BACKEND_PORT}/api/v1`,
      },
    })

    nextProcess.stdout.on('data', d => {
      const txt = d.toString()
      console.log('[next]', txt.trim())
      if (txt.includes('Ready') || txt.includes('started server')) resolve()
    })
    nextProcess.stderr.on('data', d => console.error('[next]', d.toString().trim()))
    nextProcess.on('error', err => { dialog.showErrorBox('Next.js Error', err.message); reject(err) })

    // Fallback resolve after 15 s
    setTimeout(resolve, 15000)
  })
}

// ── Create browser window ──────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'AuditIQ',
    show: false,
    // icon: path.join(__dirname, 'icon.ico'),  // add when you have the icon
  })

  mainWindow.loadURL(`http://localhost:${NEXT_PORT}`)
  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.on('closed', () => { mainWindow = null })
}

// ── App lifecycle ──────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    await startBackend()
    await startNext()
    createWindow()
  } catch (err) {
    console.error('Startup error:', err)
    dialog.showErrorBox('AuditIQ failed to start', String(err))
    app.quit()
  }
})

app.on('window-all-closed', () => { app.quit() })

app.on('before-quit', () => {
  if (backendProcess) { backendProcess.kill(); backendProcess = null }
  if (nextProcess)    { nextProcess.kill();    nextProcess = null }
})
