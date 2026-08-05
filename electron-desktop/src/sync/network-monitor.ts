// ============================================
// 网络状态监听
// ============================================
// Electron 提供 navigator.onLine 事件
// 但 navigator.onLine 只检测物理网卡,不保证能访问 Sealos
// 更可靠的做法:每 30 秒 ping 一次 Sealos /api/health

import { net } from 'electron';
import { EventEmitter } from 'node:events';

class NetworkMonitor extends EventEmitter {
  private isOnline = true;
  private pingHandle: NodeJS.Timeout | null = null;

  start(): void {
    this.pingHandle = setInterval(() => this.ping(), 30 * 1000);
    this.ping();  // 立即跑一次
  }

  stop(): void {
    if (this.pingHandle) clearInterval(this.pingHandle);
  }

  private async ping(): Promise<void> {
    try {
      const res = await net.fetch('https://your-app.sealoshzh.site/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      const newState = res.ok;
      if (newState !== this.isOnline) {
        this.isOnline = newState;
        this.emit(newState ? 'online' : 'offline');
        console.log(`[network] 状态变化: ${newState ? '在线' : '离线'}`);
      }
    } catch {
      if (this.isOnline) {
        this.isOnline = false;
        this.emit('offline');
        console.log('[network] 状态变化: 离线');
      }
    }
  }

  getStatus(): boolean {
    return this.isOnline;
  }
}

export const networkMonitor = new NetworkMonitor();