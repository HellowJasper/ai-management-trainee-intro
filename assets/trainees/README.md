# Trainee Assets

把真实候选人图片按候选人 `id` 分文件夹放置：

- 生活照：`assets/trainees/<id>/photo.png`
- 表情包：`assets/trainees/<id>/meme.png`

例如：

```text
assets/trainees/xu-ran/photo.png
assets/trainees/xu-ran/meme.png
```

对应资料在 `data/trainees.json` 中维护。图片暂时缺失时，页面会使用候选人的渐变占位背景。
