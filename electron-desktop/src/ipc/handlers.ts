// ============================================
// IPC 处理器:Vue 通过 window.api.* 调用主进程能力
// ============================================
// 注册的 IPC 通道:
//   - books:list       → 读本地缓存列表
//   - books:get        → 读本地缓存单条
//   - books:create     → 远程创建(离线则入队)
//   - books:update     → 远程更新(离线则入队)
//   - books:delete     → 远程删除(离线则入队)
//   - books:borrow     → 远程借出(离线则入队)
//   - books:return     → 远程归还(离线则入队)
//   - sync:status      → 查看队列状态
//   - sync:trigger     → 手动触发增量同步
//   - network:status   → 当前在线/离线

import type { IpcMain } from 'electron';
import {
  listBooksLocal,
} from '../db/local-db.ts';
import { enqueueWrite, getQueueStats } from '../sync/push-queue.ts';
import { startSyncEngine } from '../sync/pull-sync.ts';
import { networkMonitor } from '../sync/network-monitor.ts';

interface IpcContext {
  remoteApi: string;
}

export function registerIpcHandlers(ipcMain: IpcMain, ctx: IpcContext): void {
  // ============================================
  // 读操作:走本地 SQLite(秒开)
  // ============================================
  ipcMain.handle('books:list', async (_e, filter) => {
    return listBooksLocal(filter);
  });

  // ============================================
  // 写操作:联网时直发远程,离线时入队
  // ============================================
  ipcMain.handle('books:create', async (_e, body) => {
    if (networkMonitor.getStatus()) {
      // 在线:直接发远程
      const res = await fetch(`${ctx.remoteApi}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await res.json();
    } else {
      // 离线:入队,返回"待同步"状态
      const id = await enqueueWrite('POST', '/books', body);
      return { success: true, data: { id, queued: true } };
    }
  });

  ipcMain.handle('books:update', async (_e, bookId, body) => {
    if (networkMonitor.getStatus()) {
      const res = await fetch(`${ctx.remoteApi}/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await res.json();
    } else {
      const id = await enqueueWrite('PATCH', `/books/${bookId}`, body);
      return { success: true, data: { id, queued: true } };
    }
  });

  ipcMain.handle('books:delete', async (_e, bookId) => {
    if (networkMonitor.getStatus()) {
      const res = await fetch(`${ctx.remoteApi}/books/${bookId}`, {
        method: 'DELETE',
      });
      return await res.json();
    } else {
      const id = await enqueueWrite('DELETE', `/books/${bookId}`, null);
      return { success: true, data: { id, queued: true } };
    }
  });

  // 借/还 复用 update 路径
  ipcMain.handle('books:borrow', async (_e, bookId, body) => {
    if (networkMonitor.getStatus()) {
      const res = await fetch(`${ctx.remoteApi}/books/${bookId}/borrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await res.json();
    } else {
      const id = await enqueueWrite('POST', `/books/${bookId}/borrow`, body);
      return { success: true, data: { id, queued: true } };
    }
  });

  ipcMain.handle('books:return', async (_e, bookId) => {
    if (networkMonitor.getStatus()) {
      const res = await fetch(`${ctx.remoteApi}/books/${bookId}/return`, {
        method: 'POST',
      });
      return await res.json();
    } else {
      const id = await enqueueWrite('POST', `/books/${bookId}/return`, null);
      return { success: true, data: { id, queued: true } };
    }
  });

  // ============================================
  // 同步状态(给 UI 显示)
  // ============================================
  ipcMain.handle('sync:status', async () => {
    return {
      online: networkMonitor.getStatus(),
      queue: await getQueueStats(),
    };
  });

  ipcMain.handle('sync:trigger', async () => {
    // 手动触发全量同步
    const wc = (global as any).__mainWindowWebContents;
    startSyncEngine(ctx.remoteApi, () => wc);
    return { success: true };
  });

  // ============================================
  // 网络状态变化广播(给 UI 实时显示)
  // ============================================
  networkMonitor.on('online', () => {
    // 通知所有渲染进程
    const wc = (global as any).__mainWindowWebContents;
    wc?.send('network:status-changed', { online: true });
  });
  networkMonitor.on('offline', () => {
    const wc = (global as any).__mainWindowWebContents;
    wc?.send('network:status-changed', { online: false });
  });
}