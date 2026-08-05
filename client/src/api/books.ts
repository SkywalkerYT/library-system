import { http, request } from './client';
import type { Book, BookStats, CategoryItem, ListQuery, ListResult } from '@/types';

export const booksApi = {
  async list(q: ListQuery) {
    return request<ListResult<Book>>(http.get('/books', { params: q }));
  },
  async get(id: number) {
    return request<Book>(http.get(`/books/${id}`));
  },
  async create(input: { title: string; author: string; category: string; summary?: string | null; coverUrl?: string | null }) {
    return request<Book>(http.post('/books', input));
  },
  async update(id: number, input: Partial<{ title: string; author: string; category: string; summary: string | null; coverUrl: string | null }>) {
    return request<Book>(http.patch(`/books/${id}`, input));
  },
  async remove(id: number) {
    return request<{ id: number }>(http.delete(`/books/${id}`));
  },
  async batchDelete(ids: number[]) {
    return request<{ deleted: number }>(http.post('/books/batch-delete', { ids }));
  },
  async borrow(id: number, input: { borrowerName: string; borrowerPhone: string; dueAt: string }) {
    return request<Book>(http.post(`/books/${id}/borrow`, input));
  },
  async return(id: number) {
    return request<Book>(http.post(`/books/${id}/return`));
  },
  async stats() {
    return request<BookStats>(http.get('/books/stats'));
  },
  // ★ 全量分类（不受分页/筛选影响），给 BookListView 顶部 pill 列表用
  async categories() {
    return request<CategoryItem[]>(http.get('/books/categories'));
  },
  // ★ 上传封面文件 → 返回 coverUrl 路径（/api/covers/<uuid>.<ext>）
  //   - FormData 上传：不能用 JSON Content-Type，要让浏览器自动加 multipart 边界
  //   - axios 不显式 set Content-Type，它会自己加 boundary
  //   - 上传后由父组件把返回的 coverUrl 写进 POST /api/books payload
  async uploadCover(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return request<{ coverUrl: string }>(http.post('/books/upload-cover', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }));
  },
};
