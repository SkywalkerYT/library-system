// ============================================
// vue-router 模块声明 —— 扩展 RouteMeta
// 让 to.meta.requiresAuth / to.meta.requiresAdmin / to.meta.guestOnly 在
// router.beforeEach 与路由数组里都有完整类型提示
// ============================================
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiresAdmin?: boolean;
    guestOnly?: boolean;
  }
}

export {};
