// ============================================
// Electron 主进程入口
// ============================================
// 职责:
//   1. 创建 BrowserWindow 加载 Vue 前端
//   2. 初始化本地 SQLite 缓存
//   3. 启动同步引擎(全量 + 增量)
//   4. 注册 IPC 处理器(给 Vue 调用)
//
// 关键设计:
//   - 窗口开 DevTools 仅在开发模式
//   - Sealos 域名从环境变量读(避免硬编码)
//   - 所有同步逻辑异步,主进程不卡 UI

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initLocalDb } from './db/local-db.ts';
import { startSyncEngine } from './sync/pull-sync.ts';
import { registerIpcHandlers } from './ipc/handlers.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ★ Sealos 远程 API 地址(从 package.json scripts 传进来,或读 .env)
const REMOTE_API = process.env.SEALOS_API ?? 'https://your-app.sealoshzh.site/api';

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: '社区图书馆',
    webPreferences: {
      // ★ 安全:开启 contextIsolation,关闭 nodeIntegration
      //   Vue 只能通过 preload 暴露的 API 访问主进程能力
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // 加载前端:开发模式连 Vite,生产模式加载 dist
  if (process.env.NODE_ENV === 'development') {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式:Vue 构建产物在 ../client/dist
    await mainWindow.loadFile(
      path.join(__dirname, '../../client/dist/index.html')
    );
  }
}

// ============================================
// 应用启动流程
// ============================================
app.whenReady().then(async () => {
  // 1. 初始化本地数据库
  await initLocalDb();

  // 2. 注册 IPC 处理器(Vue 调用主进程的入口)
  registerIpcHandlers(ipcMain, { remoteApi: REMOTE_API });

  // 3. 创建窗口
  await createWindow();

  // 4. 窗口创建后,启动同步引擎(全量首次 + 增量定时)
  if (mainWindow) {
    startSyncEngine(REMOTE_API, () => mainWindow!.webContents);
  }
});

// macOS 关闭所有窗口时不退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});