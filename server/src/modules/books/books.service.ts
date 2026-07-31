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
  async list(q: ListQuery) {
    return booksRepo.findMany({
      keyword: q.keyword,
      category: q.category,
      status: q.status,
      page: q.page,
      pageSize: q.pageSize,
    });
  },

  async get(id: number) {
    const book = await booksRepo.findById(id);
    if (!book) throw new HttpError(404, 'BOOK_NOT_FOUND', '图书不存在');
    return book;
  },

  async create(input: BookCreateInput) {
    return booksRepo.create(input);
  },

  async update(id: number, input: BookUpdateInput) {
    const result = await booksRepo.update(id, input);
    if (!result) throw new HttpError(404, 'BOOK_NOT_FOUND', '图书不存在');
    return result;
  },

  async remove(id: number) {
    const ok = await booksRepo.delete(id);
    if (!ok) throw new HttpError(404, 'BOOK_NOT_FOUND', '图书不存在');
  },

  async batchDelete(ids: number[]) {
    const count = await booksRepo.batchDelete(ids);
    return { deleted: count };
  },

  async borrow(id: number, input: BorrowInput) {
    // 仓储层已直接抛 HttpError(409, 'ALREADY_BORROWED')；这里只补 404
    const result = await booksRepo.borrow(id, {
      borrowerName: input.borrowerName,
      borrowerPhone: input.borrowerPhone,
      dueAt: new Date(input.dueAt),
    });
    if (!result) throw new HttpError(404, 'BOOK_NOT_FOUND', '图书不存在');
    return result;
  },

  async return(id: number) {
    // 仓储层已直接抛 HttpError(409, 'NOT_BORROWED')；这里只补 404
    const result = await booksRepo.return(id);
    if (!result) throw new HttpError(404, 'BOOK_NOT_FOUND', '图书不存在');
    return result;
  },

  async stats() {
    return booksRepo.stats();
  },

  async categories() {
    return booksRepo.categories();
  },
};