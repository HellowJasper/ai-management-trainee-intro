# 评委端 SOP 与评分闭环需求文档 v1

## 1. 背景

AI 星锐黑客松平台需要支持评委在用户端完成路演评分，管理员在后台查看评分提交进度，并在全部评委完成提交后锁定评分，用于最终排名核算。

本文档用于前后端协作。页面需求使用 Markdown 描述；接口中的 JSON 仅作为前后端传输格式。

## 2. 角色边界

评委：
- 登录后进入评委评分页。
- 对每支队伍完成五维评分。
- 可先暂存评分，暂存不计入最终结果。
- 正式提交后不可继续修改。

管理员：
- 在管理后台查看各评委提交进度。
- 在所有评委完成所有队伍评分后锁定专家评分。
- 锁定后，评分进入最终结果核算。

选手 / 观众：
- 不展示评委评分入口。
- 不允许调用评分提交、锁定相关接口。

## 3. 评分维度

总分 100 分，五维加权：

| 字段 | 中文名 | 权重 |
| --- | --- | --- |
| innovation | 创新性 | 25% |
| engineering | 技术实现 | 25% |
| business | 业务价值 | 25% |
| feasibility | 可行性 | 15% |
| presentation | 演示表现 | 10% |

单项评分范围为 0-100 分。后端按权重计算 `totalScore`，保留两位小数。

## 4. 状态流转

评分记录状态：

| 状态 | 说明 | 是否计入结果 | 是否可编辑 |
| --- | --- | --- | --- |
| draft | 暂存评分 | 否 | 是 |
| submitted | 已正式提交 | 是 | 否 |
| locked | 管理员已锁定 | 是 | 否 |

流转规则：
- `draft -> submitted`：评委正式提交。
- `submitted -> locked`：管理员锁定。
- `submitted` 和 `locked` 状态不允许再保存或覆盖。
- 管理员只能在全部评委完成全部队伍评分后锁定。

## 5. 已完成内容

前端用户端：
- 评委评分页已支持五维滑杆评分。
- 已接入后端读取本人评分记录。
- 已支持“暂存评分”和“正式提交”。
- 已对已提交 / 已锁定的评分行做只读处理。
- 已同步评委端状态提示：同步中、已暂存、已提交/锁定、失败。

管理后台：
- 已接入评分进度读取接口。
- 已新增评委提交进度面板。
- 已新增“锁定专家评分”操作按钮。
- 已在后台指标区展示提交进度和锁定状态。

后端接口：
- 已提供评委本人评分读取、暂存、提交接口。
- 已提供管理员评分进度和锁定接口。
- 文件存储与 MySQL Repository 均已覆盖评分状态流转。
- 最终结果快照已只使用 `submitted / locked` 状态的专家评分。

测试：
- 已有后端与逻辑测试覆盖评分暂存、提交、进度、锁定流程。

## 6. 待后端继续确认 / 开发内容

飞书登录与身份映射：
- 需要确认飞书 OAuth 回调域名与线上域名。
- 需要维护用户角色映射：评委、管理员、选手、观众。
- 严格模式下，评分接口必须使用 session 中的评委用户 ID，不接受前端传入伪造 ID。

数据库：
- 需要确认生产库 `judge_scores` 表结构与当前 Repository 字段一致。
- 需要确认评分记录唯一键为 `judge_id + team_id`。
- 需要确认 `score_json` 存储五维评分对象。

后台控制：
- 需要确认管理员锁定后是否允许超级管理员回滚。
- 当前版本不做回滚，避免现场最终结果被误改。

并发与审计：
- 需要确认同一评委多端同时编辑时的覆盖策略。
- 当前版本按最后一次暂存覆盖，正式提交后拒绝覆盖。
- 后续可补充 `version` 或 `updatedAt` 乐观锁。

## 7. 接口契约

### 7.1 读取本人评分

`GET /api/judge/my-scores`

权限：评委。

返回：

```json
{
  "judgeId": "judge_001",
  "teams": {
    "marketing": {
      "status": "draft",
      "scores": {
        "innovation": 85,
        "engineering": 88,
        "business": 90,
        "feasibility": 82,
        "presentation": 86
      },
      "totalScore": 86.75,
      "submittedAt": "",
      "updatedAt": "2026-06-25T10:00:00.000Z"
    }
  },
  "scores": {},
  "updatedAt": "2026-06-25T10:00:00.000Z"
}
```

### 7.2 暂存评分

`POST /api/judge/scores/draft`

权限：评委。

请求：

```json
{
  "scores": {
    "marketing": {
      "innovation": 85,
      "engineering": 88,
      "business": 90,
      "feasibility": 82,
      "presentation": 86
    }
  }
}
```

返回：

```json
{
  "accepted": true,
  "judgeId": "judge_001",
  "receivedTeamIds": ["marketing"],
  "updatedAt": "2026-06-25T10:00:00.000Z"
}
```

### 7.3 正式提交评分

`POST /api/judge/scores/submit`

权限：评委。

请求：

```json
{
  "teamIds": ["marketing", "pharma", "clinical", "functions", "production"],
  "scores": {
    "marketing": {
      "innovation": 85,
      "engineering": 88,
      "business": 90,
      "feasibility": 82,
      "presentation": 86
    }
  }
}
```

规则：
- 所有维度必须完整。
- 已提交或已锁定的队伍评分不可重复提交。

### 7.4 管理员查看评分进度

`GET /api/admin/judge/progress`

权限：管理员。

返回：

```json
{
  "locked": false,
  "judgeCount": 3,
  "teamCount": 5,
  "judges": [
    {
      "judgeId": "judge_001",
      "name": "评委 A",
      "submittedCount": 5,
      "draftCount": 0,
      "missingCount": 0,
      "totalTeamCount": 5,
      "status": "submitted"
    }
  ],
  "teams": [
    {
      "teamId": "marketing",
      "submittedJudgeCount": 3,
      "averageScore": 88.5
    }
  ]
}
```

### 7.5 管理员锁定评分

`POST /api/admin/judge/lock`

权限：管理员。

规则：
- 全部评委必须提交全部队伍评分。
- 成功后所有 `submitted` 记录转为 `locked`。
- 锁定失败返回 409。

## 8. 前端联调建议

本地联调顺序：
1. 以评委身份进入用户端评委评分页。
2. 调整五维评分，点击“暂存评分”。
3. 刷新页面，确认评分从后端恢复。
4. 点击“正式提交”，确认评分行变只读。
5. 管理员进入后台，确认评分进度增加。
6. 全部评委提交后点击“锁定专家评分”。
7. 进入最终结果发布流程，确认只取已提交/已锁定专家评分。

## 9. 风险点

- 飞书回调域名未配置正确会导致无法登录。
- 如果评委账号没有绑定 `judge` 角色，会无法进入评分接口。
- MySQL 表结构与 Repository 字段不一致会导致评分写入失败。
- 现场锁定前必须确认所有评委提交完成，当前版本不提供回滚入口。
