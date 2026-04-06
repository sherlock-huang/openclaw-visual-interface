========================================
  OpenClaw Agent 接入包
  使用说明
========================================

【文件说明】
  my-agent.js  ← 你需要编辑的文件（设置名字、能力等）
  openclaw.js  ← SDK 核心（不需要修改）
  start.bat    ← Windows 双击启动
  start.sh     ← Mac / Linux 启动脚本

【系统要求】
  只需要安装 Node.js（免费）：
  https://nodejs.org/zh-cn/download
  选择 LTS 版本，一路下一步安装即可

【使用步骤】

  1. 用记事本打开 my-agent.js
     找到 "=== 你的配置 ===" 区域
     修改：
       name:         你的 Agent 名字（显示在 Dashboard 上）
       role:         你的角色（worker / specialist / coordinator）
       host:         你的机器名（随便写，用于标识）
       capabilities: 你的能力列表

  2. 保存文件

  3. 确认服务器已经在运行
     （OpenClaw 服务器那台机器上 1-start-server.bat 和
       2-start-tunnel.bat 已经启动）

  4. Windows：双击 start.bat
     Mac/Linux：终端里运行 bash start.sh

  5. 打开 Dashboard 查看你的 Agent：
     https://openclaw-visual-interface.pages.dev

【常见问题】

  Q: 提示"连接失败"
  A: 检查服务器是否已启动，隧道是否在运行

  Q: 想让 Agent 做实际的事情
  A: 编辑 my-agent.js 中的 handleMessage 函数
     在那里写你的 AI 调用逻辑

  Q: 如何发消息给特定 Agent？
  A: agent.sendMessage("对方的AgentID", "消息内容")

  Q: 如何广播给所有 Agent？
  A: agent.broadcast("广播内容")

========================================
