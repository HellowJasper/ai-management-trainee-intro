# Site 观众端真实后端化设计

日期：2026-06-25

## 1. 目标

把 `site.html` 的观众侧从“静态数据 + 浏览器本地状态”改成“后端 MySQL 真实状态驱动”。

这里的“观众侧”不是单独的投票按钮，而是 `site.html` 中观众能看到和使用的整条链路：

- 首页：当前阶段、倒计时、队伍数、总票数。
- 新生看板：真实 trainee 数据。
- 赛事指南：当前阶段和赛事配置。
- 组队进度：真实队伍、成员、队伍状态。
- 作品展厅：真实作品列表和作品详情。
- 投票页：真实投票窗口、真实票数、当前用户是否已投票。
- 排行榜 / 结果页：真实发布结果，未发布时显示真实空状态。
- 我的：真实登录态、角色、权限、投票状态。

## 2. 当前证据

### 2.1 后端已经具备 MySQL 基础

当前 `main` 分支启动后强制使用 MySQL：

- `server/index.js`：启动入口，在 `require.main === module` 分支中把默认 `DATA_BACKEND` 设为 `mysql`。
- `server/repositoryFactory.js`：根据 `DATA_BACKEND=mysql` 切换到 MySQL repository。
- `server/mysqlClient.js`：读取 `MYSQL_HOST`、`MYSQL_PORT`、`MYSQL_DATABASE`、`MYSQL_USER`、`MYSQL_PASSWORD`。
- `db/schema.mysql.sql`：定义 MySQL 表。

本地已经验证：

- `/api/health` 返回 `dataBackend=mysql`。
- `/api/trainees` 返回 HTTP 200。
- `/api/teams` 返回 HTTP 200。
- `/api/vote-results` 返回真实 MySQL 票数。

### 2.2 观众端仍混用假状态

`src/site.js` 当前仍依赖：

- `root.ScreenData`：来自 `src/screen-data.js` 的静态演示数据。
- `localStorage`：保存投票、组队、角色、作品草稿等本地状态。
- 前端即时改票数：投票成功后有 `team.votes += 1` 这类逻辑。
- 前端兜底：后端失败后继续使用本地演示状态。

这些逻辑让页面“看起来能用”，但不是以后端数据库为事实来源。

## 3. 术语解释

### 3.1 Bootstrap

`bootstrap` 是“页面启动数据包”。页面第一次打开时，一次性从后端拿到当前页面所需的核心状态。

这里计划新增：

```http
GET /api/site/bootstrap
```

它返回当前观众端所需的真实状态，例如用户、角色、阶段、队伍、作品、票数、我的投票和结果发布状态。

### 3.2 Repository

`repository` 是“数据仓储层”。它封装某一类数据的读写，比如：

- `mysqlVoteResultsRepository` 负责投票窗口、投票记录、票数统计。
- `mysqlTeamRepository` 负责队伍和成员。
- `mysqlWorksRepository` 负责作品。
- `mysqlUserRoleRepository` 负责用户和角色。

页面和 API 不应该直接写 SQL，而应该通过 repository 读取和修改数据。

### 3.3 Session

`session` 是后端登录态。用户登录后，后端用 cookie 识别用户是谁、是什么角色、有什么权限。

观众投票必须使用 session 里的用户 ID，而不是相信前端传来的 `userId`。原因是前端数据可以被伪造。

### 3.4 Single Source Of Truth

`Single Source Of Truth` 是“单一事实源”。这次的单一事实源应该是 MySQL 后端，而不是浏览器 `localStorage`。

换句话说：

- 票数以数据库 `votes` 表统计为准。
- 是否投过票以后端当前 session 对应的 active vote 为准。
- 队伍和成员以数据库 `teams` / `team_members` 为准。
- 作品以数据库 `works` 为准。
- 最终结果以数据库 `result_snapshots` 为准。

## 4. 推荐架构

新增一个服务层文件：

```text
server/siteStateService.js
```

它的职责是组合已有 repository，生成观众端所需的页面状态。

建议接口：

```js
async function buildSiteBootstrapState({
  request,
  authSessionRepository,
  adminStateRepository,
  missionCountdownRepository,
  roadshowRepository,
  repository,
  teamRepository,
  voteResultsRepository,
  worksRepository,
  resultSnapshotRepository,
}) {}
```

然后在 `server/index.js` 中新增：

```http
GET /api/site/bootstrap
```

这个接口不直接写数据库，只读数据并聚合返回。

## 5. API 设计

### 5.1 `GET /api/site/bootstrap`

返回结构建议：

```json
{
  "me": {
    "user": null,
    "role": null,
    "roles": [],
    "permissions": {},
    "needsRoleSelection": false,
    "source": "backend-pending"
  },
  "stage": {
    "currentStageId": "result",
    "stages": []
  },
  "timers": {
    "missionCountdown": {},
    "roadshow": {}
  },
  "trainees": [],
  "teams": [],
  "works": [],
  "vote": {
    "status": "voting",
    "windowLabel": "投票窗口开启中",
    "pointScale": [100, 85, 70, 55, 40],
    "results": [],
    "myVoteTeamId": ""
  },
  "result": {
    "published": false,
    "snapshot": null
  }
}
```

### 5.2 当前用户投票状态

后端要根据 session 找到当前用户：

1. 从 cookie 中读取 session id。
2. 用 `authSessionRepository.getSession(sessionId)` 找用户。
3. 如果用户存在，用用户 ID 在 vote state 中查当前 active vote。
4. 返回 `myVoteTeamId`。

未登录时：

```json
"myVoteTeamId": ""
```

已登录且已投票时：

```json
"myVoteTeamId": "marketing"
```

### 5.3 现有写接口保留

投票继续使用现有接口：

```http
POST /api/vote/cast
POST /api/vote/cancel
```

但前端写入后必须刷新后端状态，不允许只改本地变量。

## 6. 页面数据流

### 6.1 初始化

当前：

```text
site.js -> ScreenData + data/trainees.json + localStorage
```

目标：

```text
site.js -> GET /api/site/bootstrap -> MySQL repositories
```

初始化后，在前端维护一个内存态：

```js
let SITE_STATE = null;
```

渲染函数只读 `SITE_STATE`，不直接读取静态 `ScreenData` 的比赛状态。

### 6.2 投票

当前：

```text
点击投票 -> 调后端失败也继续本地加票 -> localStorage 记录已投
```

目标：

```text
点击投票 -> POST /api/vote/cast -> 后端写 votes 表 -> 前端重新拉 /api/site/bootstrap -> 页面刷新真实票数
```

取消投票同理。

### 6.3 作品展厅

当前：

```text
作品卡片来自 ScreenData.teams 中的 project/pitch/stack/votes
```

目标：

```text
作品卡片来自 bootstrap.works
```

如果数据库没有作品：

```text
显示真实空状态：“作品暂未发布”
```

不能继续展示 mock 项目。

### 6.4 排行榜 / 结果

当前：

```text
根据 ScreenData.computeRanking() 前端计算演示排行
```

目标：

```text
优先展示 bootstrap.result.snapshot
```

如果结果未发布：

```text
显示“结果待公布”
```

不要用演示排名伪装正式结果。

## 7. 后端实现范围

第一阶段只做观众端真实化，不扩展后台复杂功能。

包含：

- 新增 `server/siteStateService.js`。
- 新增 `GET /api/site/bootstrap`。
- 补测试覆盖 bootstrap。
- 前端 `site.js` 改为从 bootstrap 取状态。
- 投票和取消投票以后端返回为准。
- 作品、结果、队伍、首页统计去 mock 化。

不包含：

- 新增复杂后台管理能力。
- 新增 AI 应用层。
- 新增文件上传。
- 重构整站 UI。
- 修改 MySQL schema，除非实现时发现现有字段无法表达观众端必要状态。

## 8. 数据来源映射

| 页面内容 | 后端来源 | 说明 |
| --- | --- | --- |
| 当前用户 | `authSessionRepository` | 由 cookie 找 session |
| 角色权限 | `src/logic.js#getRolePermissions` | 后端已复用该逻辑 |
| 当前阶段 | `adminStateRepository` | 对应 `/api/admin/state` |
| 倒计时 | `missionCountdownRepository` / `roadshowRepository` | 首页阶段倒计时 |
| 新生看板 | trainee repository | 对应 `/api/trainees` |
| 队伍进度 | `teamRepository` | 对应 `/api/teams` |
| 票数 | `voteResultsRepository` | 对应 `/api/vote-results` |
| 我的投票 | `voteResultsRepository` + session user id | 不能用 localStorage |
| 作品 | `worksRepository` | 对应 `/api/works` |
| 最终结果 | `resultSnapshotRepository` | 对应 `/api/results/latest` |

## 9. 边界管理与回归保护

这次改造必须控制在 `site.html` 的观众侧，不顺手重构后台、大屏或评委/选手流程。

### 9.1 允许修改的边界

允许新增或修改：

- `server/siteStateService.js`：新增观众端聚合状态服务。
- `server/index.js`：只新增 `GET /api/site/bootstrap` 路由；现有 API 路径保持兼容。
- `src/site.js`：只替换观众侧数据来源和观众侧写操作后的刷新逻辑。
- `src/data.js`：如有必要，只补通用 loader，不改变已有 loader 的返回契约。
- `tests/server.test.js`：新增 bootstrap 和观众端真实状态测试。
- `tests/logic.test.js`：新增前端去 mock 行为测试。

### 9.2 不主动修改的边界

除非后续单独确认，不修改：

- `admin.html` 和 `src/admin.js`：后台管理台保持现状。
- `screen.html`、`src/screen.js`、`src/screen-data.js`：大屏展示保持现状。
- `db/schema.mysql.sql`：不改 MySQL 表结构，除非实现时证明现有表无法表达必要观众状态。
- 飞书 OAuth 主流程：不重写登录，只复用现有 session。
- 评委评分和选手作品提交流程：只保证观众端读取结果，不扩展评委/选手能力。

### 9.3 现有接口兼容

以下接口必须保持原有语义，不改名、不改变主要响应结构：

```http
GET /api/health
GET /api/me
GET /api/teams
GET /api/trainees
GET /api/vote-results
POST /api/vote/cast
POST /api/vote/cancel
GET /api/works
GET /api/results/latest
```

新增的 `/api/site/bootstrap` 是聚合接口，不替代上述接口。这样后台、大屏和现有测试仍可继续使用旧路径。

### 9.4 写操作保护

观众端只允许触发观众角色能做的写操作：

```http
POST /api/vote/cast
POST /api/vote/cancel
```

其他写操作，例如组队、作品提交、评委评分、后台管理，不作为本次观众端真实化的一部分。

### 9.5 前端状态保护

`localStorage` 只能保留非关键 UI 状态，例如：

- 当前卡片索引。
- 临时视觉偏好。
- 未提交的纯 UI 草稿。

以下状态不能再以 `localStorage` 为事实来源：

- 是否已投票。
- 投给哪支队伍。
- 真实票数。
- 队伍成员。
- 作品发布状态。
- 最终排名。
- 当前登录角色和权限。

### 9.6 回归验证

每个实现阶段都要运行：

```bash
npm test
```

并至少手工验证：

```bash
curl http://localhost:5173/api/health
curl http://localhost:5173/api/site/bootstrap
curl http://localhost:5173/api/teams
curl http://localhost:5173/api/vote-results
curl http://localhost:5173/api/works
```

同时检查浏览器：

- `http://localhost:5173/site.html`
- `http://localhost:5173/admin`
- `http://localhost:5173/screen`

原因：虽然本次只改观众端，但 `server/index.js` 是共享入口，任何路由改动都有可能影响后台和大屏。

### 9.7 实施节奏

实现时按最小步推进：

1. 先加后端只读 bootstrap，不改前端。
2. 测试 bootstrap 不影响旧接口。
3. 再让 `site.js` 初始化读取 bootstrap。
4. 测试首页、新生看板、组队进度、作品展厅仍能渲染。
5. 再替换投票写逻辑。
6. 测试投票、取消投票、刷新后状态保持。
7. 最后去掉正式观众端的 mock 展示。

任何一步失败，回滚该步，不继续叠加修改。

## 10. 错误处理

### 10.1 Bootstrap 局部失败

`/api/site/bootstrap` 作为页面关键接口，原则上应该整体成功。

如果某个 repository 报错：

- 开发阶段直接返回 500，方便暴露真实问题。
- 不建议静默 fallback 到 mock 数据。

原因：这次目标就是去假数据化，如果接口失败仍展示 mock，会再次掩盖问题。

### 10.2 投票失败

常见失败：

- 未登录或无权限：`401` / `403`。
- 投票窗口关闭：`409`。
- 已投其他队伍：`409`。
- 队伍不存在：`404`。

前端应该展示后端错误，不再本地加票。

## 11. 测试计划

### 11.1 后端测试

在 `tests/server.test.js` 增加：

- `GET /api/site/bootstrap` 未登录时返回观众可读基础状态。
- 登录 public 用户后返回 `me.role = public`。
- 已投票用户返回 `vote.myVoteTeamId`。
- 作品为空时返回 `works = []`，不注入 mock。
- 结果未发布时返回 `result.published = false`。

### 11.2 前端逻辑测试

在 `tests/logic.test.js` 或现有 site 相关测试中增加：

- `src/site.js` 不再在投票成功后直接 `team.votes += 1`。
- `src/site.js` 使用 `/api/site/bootstrap` 初始化观众数据。
- 作品展厅不再依赖 `ScreenData.teams` 作为正式作品来源。
- 结果页不再默认使用 `computeRanking()` 作为正式结果。

### 11.3 手工验证

启动：

```bash
npm run dev
```

验证：

```bash
curl http://localhost:5173/api/site/bootstrap
curl http://localhost:5173/api/vote-results
curl http://localhost:5173/api/works
curl http://localhost:5173/api/results/latest
```

浏览器验证：

- 打开 `http://localhost:5173/site.html`。
- 进入作品展厅，确认没有 mock 作品。
- 登录观众角色后投票，确认票数来自后端刷新。
- 取消投票后再次刷新页面，确认状态仍正确。
- 关闭投票窗口后，确认前端不能继续投票。

## 12. 验收标准

完成后应满足：

- 刷新浏览器后，投票状态不会丢失。
- 换一台设备登录同一个用户，投票状态一致。
- 数据库票数和页面票数一致。
- 后端接口失败时，不再展示假票数或假作品。
- 作品没有发布时，作品展厅显示真实空状态。
- 结果没有发布时，排行榜显示“待公布”，不展示演示排名。
- `/api/site/bootstrap` 可以解释观众端页面上所有关键状态的来源。

## 13. 待确认规则

实现前仍建议确认：

1. 未绑定角色的飞书用户是否默认作为 `public` 观众。
2. 观众是否允许取消投票。
3. 投票关闭后是否展示实时票数。
4. 作品未发布时，作品展厅文案使用“作品暂未发布”还是“敬请期待”。
5. 结果发布前是否完全隐藏排名，还是允许管理员预览。

当前建议默认：

- 未绑定飞书用户默认 `public`。
- 观众允许取消投票，只要投票窗口仍为 `voting`。
- 投票关闭后观众可以看票数，但不能再投。
- 作品未发布时显示“作品暂未发布”。
- 正式观众不显示预览排名。
