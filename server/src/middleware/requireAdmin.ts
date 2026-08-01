// ============================================
// 管理员鉴权中间件
// 必须在 requireAuth 之后挂（依赖 req.userId）
//
// 设计取舍（请你审阅 ★协作点 2）：
//   1) DB 二次校验 —— JWT 7 天内有效期间，提权/降权/撤销必须即时生效
//      代价：每次 admin 请求多一次 SELECT User.isAdmin（已加 @@index([isAdmin])）
//   2) 401 vs 403 区分 ——
//      401 = 未登录 / token 失效 / token 伪造 → 前端 axios 拦截器清登录态、跳 login
//      403 = 登录但非 admin → 保留登录态、显式提示"权限不足"
//      这样 admin 路由被前端误传 / URL 误植后，不会无故把用户踢下线
//   3) 不做内存缓存 —— 当前 admin 端点极低 QPS（人手操作），等真有性能问题再加 LRU
// ============================================
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { HttpError } from '../utils/errors.js';

export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  // ★ req.userId 一定存在（因为 router.use(requireAuth) 先于 requireAdmin 挂）
  //   这里用 ! 兜底（TS narrowing），不合法理论上 401 在前一步就该返回
  if (!req.userId) {
    return next(new HttpError(401, 'UNAUTHORIZED', '未登录'));
  }

  // ★ DB 二次校验 —— 提权 / 降权 / 撤销即时生效（避免 JWT 7 天冻结窗口）
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { isAdmin: true },
  });

  // 用户不存在 / 已被删除 → 视同伪造凭证，给 401
  if (!user) {
    return next(new HttpError(401, 'UNAUTHORIZED', '账户不存在或已注销'));
  }

  // 登录但非 admin → 403（保留登录态，前端 AdminUsersView 会 catch 后提示）
  if (!user.isAdmin) {
    return next(new HttpError(403, 'FORBIDDEN', '需要管理员权限'));
  }

  // ★ 同步刷新 req.isAdmin（防止 JWT 旧值与 DB 新值短期不一致 —— 例如刚提权过的用户），
  //   下游 controller 拿到的是权威值
  req.isAdmin = true;
  next();
}
