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

---

## 附录：部署点单清单

> 上面「部署上线」是流程概述；这里是**逐步点击清单** —— 复制粘贴命令、照着点鼠标即可。

### A. 推送代码到 GitHub

```bash
# 1) 在 GitHub 上 New Repository，名字比如 library-system，不要勾任何初始化选项
# 2) 本地添加 remote 并推送
git remote add origin git@github.com:你的用户名/library-system.git
git push -u origin main
```

推送成功后访问 `https://github.com/你的用户名/library-system`，应该看到 67 个文件、CI 绿对勾。

### B. Railway（后端 + 数据库）

| # | 操作 | 备注 |
|---|---|---|
| 1 | 登录 [railway.app](https://railway.app/) → **New Project** → **Deploy from GitHub repo** → 选 `library-system` | 第一次会让 GitHub 授权 |
| 2 | 项目里点 **+ New** → **Database** → **MySQL** | 等 1~2 分钟初始化完成 |
| 3 | 点 MySQL 服务 → **Variables** 标签 → 复制 `MYSQL_URL`（格式 `mysql://root:xxx@xxx.railway.app:PORT/railway`） | 这串等会要用 |
| 4 | 项目里再点 **+ New** → **GitHub Repo** → 选 `library-system` 同一个仓库 | 会拉一份独立服务 |
| 5 | 新服务点 **Settings** → **Root Directory** 填 `server` → **Save** | 不填会找不到 package.json |
| 6 | 新服务点 **Variables** → **+ New Variable**，逐条加： | 见下表 ↓ |
| 7 | 点 **Deploy** → 看 logs，等出现 `Server listening on 0.0.0.0:PORT` | 第一次部署会跑 `prisma migrate deploy` |
| 8 | 新服务点 **Settings** → **Networking** → **Generate Domain` | 拿到形如 `https://xxx.up.railway.app` 的域名 |

**Variables 清单**（B-6 步骤用）：

| Key | Value | 说明 |
|---|---|---|
| `DATABASE_URL` | 粘贴 B-3 复制的那串 `MYSQL_URL` | 也可直接用 Railway 引用语法 `${{MySQL.MYSQL_URL}}` |
| `JWT_SECRET` | `openssl rand -hex 32` 输出粘贴进来 | 32 字节随机；**不要用 `secret` 这种弱值** |
| `CLIENT_ORIGIN` | **先留空**，部署前端后再回来填 | CORS 白名单 |
| `NODE_ENV` | `production` | 关掉 tsx watch 等开发特性 |

**冒烟验证**：拿到 Railway 域名后，本地 `curl` 一下确认通了再走前端部署：

```bash
curl https://xxx.up.railway.app/api/health
# 期望：{"success":true,"data":{"ok":true}}
```

### C. Vercel（前端）

| # | 操作 | 备注 |
|---|---|---|
| 1 | 登录 [vercel.com](https://vercel.com/) → **Add New…** → **Project** → 选 `library-system` 仓库 → **Import** | 第一次会让 GitHub 授权 |
| 2 | **Project Configuration** → **Root Directory** → 点 **Edit** → 选 `client` | 不选会找不到 vite.config |
| 3 | **Environment Variables** 加 1 条：`VITE_API_BASE` = `https://xxx.up.railway.app/api` | **末尾必须有 `/api`** |
| 4 | 点 **Deploy** → 等 1~2 分钟 | 构建日志里有 `✓ built in` 即成功 |
| 5 | 部署完跳到项目页 → 顶部会显示域名 `https://library-system-xxx.vercel.app` | 复制这个域名 |
| 6 | **回到 B-6 步骤** → 把 `CLIENT_ORIGIN` 填成上面那个 Vercel 域名 → Railway 自动重启 | 不填前端调 API 会撞 CORS |
| 7 | 浏览器打开 Vercel 域名 → 注册账号 → 自己加书 → 看到 KPI 面板 = 上线完成 |  |

### D. 部署后冒烟（必走）

| 场景 | 命令 / 操作 | 期望 |
|---|---|---|
| 后端健康 | `curl https://xxx.up.railway.app/api/health` | `{"success":true,"data":{"ok":true}}` |
| 跨域通 | 浏览器打开 Vercel 域名 → 注册 → 进首页 | 控制台无 CORS 红字 |
| 数据隔离 | 注册 A → 加书 → 退出 → 注册 B → 加书 → 看 B 的列表 | B 看不到 A 的书（userId 隔离生效） |
| 借出冲突 | 对同一本书借出两次 | 第二次返回 409，UI 弹「该书已借出」 |

### E. 日常维护

| 任务 | 命令 |
|---|---|
| 改 schema | `cd server && npx prisma migrate dev --name <name>` → 提交 → 推 main → Railway 自动 `prisma migrate deploy` |
| 跑单元测 | `cd server && npm test` |
| 跑集成测 | `cd server && npm run test:integration`（需要本地 MySQL） |
| 看数据库 | `npx prisma studio` 打开本地 GUI；Railway 的 MySQL 用 Railway 内置 Data tab |
| 看部署日志 | Railway 项目页 → 服务 → **Deployments** 标签 → 任一点开看 logs |

---

## 验证完成清单

每勾一项就证明这块已经可以生产使用：

- [x] 本地 MySQL 启动 + `prisma migrate status` = `up to date`
- [x] `npm test` 通过（health 单测 2 个）
- [x] `npm run test:integration` 通过（端到端冒烟 1 个：register→login→add→borrow→return→stats→delete）
- [x] `npm run dev` 后 `curl http://localhost:3000/api/health` = 200
- [x] curl 全链 9 个端点状态码全对：register 201、login 200、addBook 201、borrow 200、return 200、stats 200、重复 borrow 409、未鉴权 401、delete 200
- [x] GitHub Actions 工作流文件齐全：`backend-ci.yml` + `frontend-ci.yml`
- [ ] 推到 GitHub → CI 绿（需 GitHub 账号）
- [ ] Railway 部署 → `curl https://xxx.up.railway.app/api/health` 通（需 Railway 账号）
- [ ] Vercel 部署 → 浏览器走通注册加书全流程（需 Vercel 账号）
