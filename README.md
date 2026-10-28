# NBA 每日选阵

[在线看板](https://levine-lai.github.io/nba-daily-lineup/)

BAO5每日150能量五人阵容、前后场性价比、对阵高阶、分差分钟风险与持有率分析。支持搜索、排序、球员详情、锁定/排除重算和CSV导出。

GitHub Pages静态托管。GitHub Actions每小时第17、47分钟尝试采集、构建和发布；任务可能排队，数据也受源站更新时间影响。页面每5分钟读取已发布快照，也可手动刷新；不承诺秒级实时。页面保留源时间、采集完成时间和发布构建时间。

来源：BAO5公开players/schedule/player-log/injuries/energy-changes/heat；[俗人的篮球场](https://www.surennba.com/)公开NBA球队效率、节奏、球员使用率与TS数据。按NBA球员ID与球队匹配，缺失不填零；真实持有率仅覆盖源站每天各位置HOT5，历史比例保留日期。模型情景频率不等于持有率。

价格与赛程采集失败会停止发布，保留线上旧版。其他源失败沿用带时间的同赛季快照并记录；逐场数据按赛季和出场数缓存，减少重复请求。

本地：`npm ci`，`python scripts/collect.py`，`npm run data:build`，`npm test`，`npm run build`。`npm run dev` 预览。

模型细节在网页“数据口径”中。初版启发式系数和正态情景尚未完成历史回测。参考了 [Fantasy EFL 数据看板](https://github.com/Levine-Lai/fantasy-efl-dashboard) 的展示思路；本项目计分和推荐针对BAO5篮球规则。

## 球队位置防守

位置攻防页使用 Hashtag Basketball 的公开全赛季、每48分钟对位置产出，覆盖30队×PG/SG/SF/PF/C。得分、篮板、助攻、抢断、盖帽及失误按 BAO5 规则重算积分；排名在同一位置内计算，失误反向解释。不直接沿用源站综合排名，也不额外乘入球员预期。球队登记位置不代表实际一对一盯防，赛季初样本未经赛程强度及节奏校正。

`python scripts/collect-dvp.py` 每30分钟随工作流尝试采集，源站按日更新；保留源站日期和成功抓取时间。源站失败时保留旧位置快照并标记。BAO5 采集失败时，工作流恢复最后成功发布且仍有开放比赛日的快照，保留原始采集时间并在界面显著提示；无可用快照则停止发布。
