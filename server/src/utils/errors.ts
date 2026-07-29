// ============================================
// 业务错误类型
// ============================================
// 用法：
//   throw new HttpError(404, 'BOOK_NOT_FOUND', '图书不存在');
//
// 设计意图：HttpError 是 *跨模块* 共享的 transport 错误，
// 不能依赖任何具体的业务模块（否则会形成循环依赖）。
// 所以它放在 utils 下，而不是 modules/auth 下。
// ============================================

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}