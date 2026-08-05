// ============================================
// Preload 脚本:在隔离的渲染进程里暴露安全的 API
// ============================================
// 关键安全设计:
//   - contextIsolation: true(默认)
//   - 只通过 contextBridge 暴露白名单 API
//   - Vue 拿不到 Node.js 原生对象(只能调我们暴露的方法)

import { contextBridge, ipcRenderer } from 'electron';

// ★ 白名单 API(给 Vue 用的所有能力)
const api = {
  // 读
  listBooks: (filter?: { keyword?: string; category?: string; status?: string }) =>
    ipcRenderer.invoke('books:list', filter),

  // 写(自动处理离线排队)
  createBook: (body: any) => ipcRenderer.invoke('books:create', body),
  updateBook: (id: number, body: any) => ipcRenderer.invoke('books:update', id, body),
  deleteBook: (id: number) => ipcRenderer.invoke('books:delete', id),
  borrowBook: (id: number, body: any) => ipcRenderer.invoke('books:borrow', id, body),
  returnBook: (id: number) => ipcRenderer.invoke('books:return', id),

  // 同步
  getSyncStatus: () => ipcRenderer.invoke('sync:status'),
  triggerSync: () => ipcRenderer.invoke('sync:trigger'),

  // 事件订阅
  onNetworkChange: (callback: (online: boolean) => void) => {
    ipcRenderer.on('network:status-changed', (_e, data) => callback(data.online));
  },
  onSyncComplete: (callback: (info: { total?: number; count?: number }) => void) => {
    ipcRenderer.on('sync:full-complete', (_e, data) => callback(data));
    ipcRenderer.on('sync:changes', (_e, data) => callback(data));
  },
};

contextBridge.exposeInMainWorld('api', api);

// ★ TypeScript 类型声明(Vue 用 window.api 时有类型提示)
export type DesktopApi = typeof api;