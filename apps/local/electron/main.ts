import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';

// Crash-safe log to known path
const CRASH_LOG = path.join(process.env.APPDATA || 'C:\\temp', 'livestat-crash.log');
function log(msg: string) {
  try { fs.appendFileSync(CRASH_LOG, `[${new Date().toISOString()}] ${msg}\n`); } catch {}
}

log('main.ts loaded');
log(`app type: ${typeof app}, isPackaged: ${app?.isPackaged}`);

const isDev = !app.isPackaged;
const PORT = 3001;

log(`isDev=${isDev}, PORT=${PORT}`);

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    frame: true,
    backgroundColor: '#0A0A0A',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../public/icon.png'),
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    log(`did-fail-load: ${code} ${desc}`);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (isDev) mainWindow?.webContents.openDevTools();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverPath = isDev
      ? path.join(__dirname, '..')
      : path.join(process.resourcesPath, 'next-server', 'apps', 'local');

    const cmd = isDev ? 'npx' : 'node';
    const args = isDev
      ? ['next', 'dev', '--port', String(PORT)]
      : [path.join(serverPath, 'server.js')];

    log(`Starting server: ${cmd} ${args.join(' ')}`);
    log(`Server path: ${serverPath}`);
    log(`Server exists: ${fs.existsSync(path.join(serverPath, 'server.js'))}`);

    nextServer = spawn(cmd, args, {
      cwd: serverPath,
      env: {
        ...process.env,
        PORT: String(PORT),
        HOSTNAME: 'localhost',
        NODE_ENV: isDev ? 'development' : 'production',
      },
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    nextServer.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString();
      log(`[next:out] ${msg}`);
      if (msg.includes('Ready') || msg.includes('started') || msg.includes(`${PORT}`)) {
        resolve();
      }
    });

    nextServer.stderr?.on('data', (data: Buffer) => {
      log(`[next:err] ${data.toString()}`);
    });

    nextServer.on('error', (err) => {
      log(`[next:error] ${err.message}`);
      reject(err);
    });

    nextServer.on('exit', (code) => {
      log(`[next:exit] code=${code}`);
    });

    // Timeout fallback — if server doesn't signal ready in 15s, try anyway
    setTimeout(() => {
      log('Server start timeout — proceeding anyway');
      resolve();
    }, 15000);
  });
}

function waitForServer(): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      fetch(`http://localhost:${PORT}/api/live`)
        .then((r) => { if (r.ok) resolve(); else setTimeout(check, 500); })
        .catch(() => setTimeout(check, 500));
    };
    check();
  });
}

// Window controls via IPC
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());

app.whenReady().then(async () => {
  log(`App ready. isDev=${isDev}, isPackaged=${app.isPackaged}`);
  log(`resourcesPath=${process.resourcesPath}`);

  if (isDev) {
    try {
      await fetch(`http://localhost:${PORT}`);
    } catch {
      await startNextServer();
    }
    await waitForServer();
  } else {
    await startNextServer();
    await waitForServer();
  }

  log('Server ready, creating window...');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
});
