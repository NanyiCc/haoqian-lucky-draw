# 好签 · 名单抽选

在线使用：https://nanyicc.github.io/haoqian-lucky-draw/

公开仓库：https://github.com/NanyiCc/haoqian-lucky-draw

无构建依赖的浏览器抽选工具。进入目录运行 `npm run dev`，打开 http://127.0.0.1:4173 。也可将根目录的 HTML、CSS 和 JS 文件部署到任意静态服务器。请通过 HTTP 打开，ES modules 不支持直接双击 HTML。

- 上传 TXT / Markdown 或直接粘贴名单；支持 UTF-8、GB18030、带 BOM 的 UTF-16。
- 根据空格、Tab、全角空格识别层级；去除常见数字序号、中文序号、项目符号、空括号；保留有内容的括号。
- 抽选范围：主名单、全部、末级、任意分组所有后代。每行视为独立条目，同名不自动合并。
- 每轮 1–50 个条目；每轮内无重复，可设置跨轮不重复。超出剩余候选数量时禁用抽选。
- 使用 Web Crypto 与拒绝采样，避免取模偏差；部分 Fisher–Yates 洗牌等概率抽选。动画与最终选择分离。
- 浏览器 localStorage 保存名单与历史；支持 CSV 导出、全屏、空格快捷键及减少动态效果偏好。
- 名单与记录在浏览器本地处理，无后端上传。浏览器存储不适合多个窗口同时操作，同一场抽选请使用一个窗口。

运行 `npm test` 验证解析、抽选边界、排除逻辑和 CSV 转义。

## GitHub Pages

发布源为 `main` 分支根目录。提交更新后 GitHub 自动发布。`.nojekyll` 保留原始静态文件，不经过 Jekyll 转换。网页可供任何人访问；实际导入的名单与抽选历史不上传 GitHub，不在使用者之间同步。
