# 社区图书馆管理系统（线上版）

> Vue 3 + Vite + TS 前端 / Express + Prisma 后端 / MySQL 数据库  
> 一行命令启动本地开发；三步部署到 Vercel + Railway

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + Vite + TypeScript + Composition API + Pinia + Vue Router + Axios |
| 后端 | Node 20 + Express 4 + TypeScript + JWT + bcrypt + zod |
| ORM | Prisma 5 |
| 数据库 | MySQL 8（本地 docker / 生产 Railway 自带 MySQL） |
| 部署 | Vercel（前端）+ Railway（后端 + DB） |

---

## 目录结构

```
library-system/
├── client/                  ← Vue 前端（部署到 Vercel）
├── server/                  ← Express 后端（部署到 Railway）
├── docker-compose.yml       ← 本地 MySQL 一键启动
├── .github/workflows/       ← 后端 + 前端 CI
└── README.md
```

---

## 本地启动（5 步）

```bash
# 1) 启动 MySQL（本项目用本地 MySQL 26.7 fork，已确认 root 密码 root123）
#    数据库名：mybook_db（注意：此 MySQL 版本将 library 视为保留字，避开它）
mysql -u root -proot123 -e "CREATE DATABASE mybook_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2) 启动后端
cd server
cp .env.example .env        # 默认连接 root:root123@localhost:3306/mybook_db
npm install
npx prisma migrate dev      # 建表
npm run dev                 # http://localhost:3000

# 3) 启动前端（另一个终端）
cd client
cp .env.example .env        # 留空 VITE_API_BASE，走 Vite 代理
npm install
npm run dev                 # http://localhost:5173
```

打开浏览器 → 注册账号 → 自己加几本书 → 看到顶部 KPI 面板 = 跑通。

> 数据库初始为空。管理员通过「新增图书」手动录入；摘要存在 `Book.summary` 字段，纯 DB 查询。

> **关于 Vite 代理**：开发环境下前端 axios baseURL 是 `/api`，由 `client/vite.config.ts` 转发到 `http://localhost:3000`。生产环境 `VITE_API_BASE` 指向 Railway 域名 + `/api`。

---

## API 一览

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | 注册（不种 demo，DB 初始为空） |
| POST | `/api/auth/login` | ❌ | 登录 |
| GET | `/api/auth/me` | ✅ | 当前用户 |
| GET | `/api/books?keyword=&category=&page=1&pageSize=20` | ✅ | 列表（分页 + 服务端搜索/筛选） |
| GET | `/api/books/stats` | ✅ | KPI 面板数据（直接搬原系统） |
| GET | `/api/books/:id` | ✅ | 详情 |
| POST | `/api/books` | ✅ | 新增 |
| PATCH | `/api/books/:id` | ✅ | 编辑 |
| DELETE | `/api/books/:id` | ✅ | 删除 |
| POST | `/api/books/:id/borrow` | ✅ | 借出（body: borrowerName/Phone/dueAt，强制 dueAt > now） |
| POST | `/api/books/:id/return` | ✅ | 归还 |
| POST | `/api/books/batch-delete` | ✅ | 批量删除（body: ids[]） |

---

## 部署上线（3 步）

### Step 1：Railway（数据库 + 后端，一起搞定）

1. 登录 [railway.app](https://railway.app/) → New Project → Deploy from GitHub Repo
2. 在项目里 **New → Database → MySQL**，自动得到一个 `MYSQL_URL` 变量
3. 再 **New → GitHub Repo**，选同一个仓库，**Root Directory 设为 `server/`**
4. 给 Web 服务设 Variables：
   - `DATABASE_URL` = 引用 MySQL 服务的 `MYSQL_URL`（用 Railway 的 `${{MySQL.MYSQL_URL}}` 语法即可）
   - `JWT_SECRET` = `openssl rand -hex 32` 生成的 32 字节随机字符串
   - `CLIENT_ORIGIN` = 你的 Vercel 域名（**先留空**，部署前端后再回来更新）
   - `NODE_ENV` = `production`
5. Deploy → 第一次部署自动跑 `prisma migrate deploy` → 拿到 Railway 域名，如 `https://xxx.up.railway.app`

> 为什么不用 PlanetScale：PlanetScale 在国内不可用。Railway MySQL 是同价位替代，自带 5GB / 外网直连 / 与 Web 服务同内网。

### Step 2：Vercel（前端）

1. 登录 [vercel.com](https://vercel.com/) → New Project → Import 仓库
2. Root Directory 设为 `client/`
3. Environment Variables：
   - `VITE_API_BASE` = Railway 域名后加 `/api`，例如 `https://xxx.up.railway.app/api`
4. Deploy → 打开 Vercel 域名
5. **最后**：回到 Railway → 更新 `CLIENT_ORIGIN` = Vercel 域名 → 重启

---

## 关键设计

### 1. 借阅字段（v2 新增）

`Book` 表新增：
- `borrowerName` 借阅人姓名
- `borrowerPhone` 借阅人电话
- `borrowedAt` 借出时间
- `dueAt` 应还时间

借出时强制 `dueAt > now()`（业务规则，防止误录）。

### 2. 图书摘要纯 DB 化（v2 已完成）

摘要存放在 `Book.summary` 字段。新用户注册时**不再种入任何 demo 数据**，DB 初始为空 —— 业务方通过「新增图书」手动录入。好处：

- 数据来源清晰（谁加的就是谁的）
- 跨用户隔离干净（不会出现 A 用户在 B 用户名下看到内容）
- 部署无副作用（同一份镜像跑任意环境都是空库起步）

### 3. 数据库可移植性

`schema.prisma` 保留 `relationMode = "prisma"`，让 schema 在 MySQL / Neon / PlanetScale / TiDB 之间切换时**零改动**。代价：join 写法不能用 `include` on nullable relations，必须手写两段查询。

### 4. JWT 鉴权

- `Authorization: Bearer <token>` 头
- 7 天过期
- Payload 只放 `userId`（不塞敏感信息）
- 中间件 `requireAuth` 挂在 `/api/books/*` 和 `/api/auth/me` 上

### 5. 参数校验

后端全用 **zod** schema，校验失败自动 400 响应。前端只做交互层提示（不重复校验，少一层心智负担；安全屏障在后端）。

---

## 下一期计划

- [ ] 图书封面图上传（暂存 Cloudinary）
- [ ] 借阅历史记录表（独立 `Loan` 表替代字段冗余）
- [ ] 管理员视图（看所有用户的书）
- [ ] 邮件提醒（应还日前 3 天）
- [x] ~~二期 BOOK_DIGESTS 迁库（title+author 唯一索引 + summary 字段）~~ — 已完成：`Book.summary` 字段已在 schema 中，纯 DB 查询实现
