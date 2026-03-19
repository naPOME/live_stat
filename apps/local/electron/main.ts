import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const isDev = !app.isPackaged;
const PORT = 3001;

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    titleBarStyle: 'hidden',
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

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
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
      : path.join(process.resourcesPath, 'next-server');

    const cmd = isDev ? 'npx' : 'node';
    const args = isDev
      ? ['next', 'dev', '--port', String(PORT)]
      : [path.join(serverPath, 'server.js')];

    nextServer = spawn(cmd, args, {
      cwd: serverPath,
      env: {
        ...process.env,
        PORT: String(PORT),
        NODE_ENV: isDev ? 'development' : 'production',
      },
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    nextServer.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString();
      process.stdout.write(`[next] ${msg}`);
      if (msg.includes('Ready') || msg.includes('started') || msg.includes(`${PORT}`)) {
        resolve();
      }
    });

    nextServer.stderr?.on('data', (data: Buffer) => {
      process.stderr.write(`[next] ${data.toString()}`);
    });

    nextServer.on('error', reject);

    // Timeout fallback — if server doesn't signal ready in 15s, try anyway
    setTimeout(resolve, 15000);
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
  if (isDev) {
    // In dev mode, assume `next dev` is already running or start it
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
