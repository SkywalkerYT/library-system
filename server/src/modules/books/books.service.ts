// ============================================
// Books 业务层
// ============================================
import { booksRepo } from './books.repository.js';
import { HttpError } from '../../utils/errors.js';
import type {
  BookCreateInput,
  BookUpdateInput,
  BorrowInput,
  ListQuery,
} from './books.schema.js';

export const booksService = {
  async list(userId: number, q: ListQuery) {
    return booksRepo.findMany(userId, {
      keyword: q.keyword,
      category: q.category,
      status: q.status,
      page: q.page,
      pageSize: q.pageSize,
    });
  },

  async get(userId: number, id: number) {
    const book = await booksRepo.findById(userId, id);
    if (!book) throw new HttpError(404, 'BOOK_NOT_FOUND', '图书不存在');
    return book;
  },

  async create(userId: number, input: BookCreateInput) {
    return booksRepo.create(userId, input);
  },

  async update(userId: number, id: number, input: BookUpdateInput) {
    const result = await booksRepo.update(userId, id, input);
    if (!result) throw new HttpError(404, 'BOOK_NOT_FOUND', '图书不存在');
    return result;
  },

  async remove(userId: number, id: number) {
    const ok = await booksRepo.delete(userId, id);
    if (!ok) throw new HttpError(404, 'BOOK_NOT_FOUND', '图书不存在');
  },

  async batchDelete(userId: number, ids: number[]) {
    const count = await booksRepo.batchDelete(userId, ids);
    return { deleted: count };
  },

  async borrow(userId: number, id: number, input: BorrowInput) {
    // 仓储层已直接抛 HttpError(409, 'ALREADY_BORROWED')；这里只补 404
    const result = await booksRepo.borrow(userId, id, {
      borrowerName: input.borrowerName,
      borrowerPhone: input.borrowerPhone,
      dueAt: new Date(input.dueAt),
    });
    if (!result) throw new HttpError(404, 'BOOK_NOT_FOUND', '图书不存在');
    return result;
  },

  async return(userId: number, id: number) {
    // 仓储层已直接抛 HttpError(409, 'NOT_BORROWED')；这里只补 404
    const result = await booksRepo.return(userId, id);
    if (!result) throw new HttpError(404, 'BOOK_NOT_FOUND', '图书不存在');
    return result;
  },

  async stats(userId: number) {
    return booksRepo.stats(userId);
  },
};
