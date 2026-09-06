# 多节点 & 多实例部署

heki 支持三种多节点部署方式，按推荐程度排列。

---

## 方式一：单进程多节点（推荐）

一个 heki 进程同时运行多个节点。源码里会为每个 `node_id` 在同一进程内启动一套独立节点实例，但它们共享同一个主进程和基础资源。用逗号分隔 `node_id` 即可：

```ini
# 配置文件方式
node_id=1,2,3

# 环境变量方式（Docker）
-e node_id="1,2,3"
```

优点：资源占用少（共享主进程和基础资源）、管理简单、日志统一。

适用场景：同一面板的多个节点。

> 如果你的目标只是“一台机器对接多个面板节点”或者“不同节点走不同出口”，通常不需要开多个 systemd 实例。单进程多节点 + 节点独立配置 + `routes.toml` 里的 `node_id:` 规则通常就够了。

如果你的需求是“多个 `node_id` 使用同一个端口，但分别绑定不同 IP”，heki 现在默认就会自动拆分监听，兼容常见旧配置直接迁移。

如果你还想强制按 `node_id` 顺序一节点一个 IP，也可以显式这样写：

```ini
node_id=2,3,4,5
listen=103.162.71.142,103.162.71.143,103.162.71.144,103.162.71.145
multi_node_listen_strategy=split
```

这时 heki 会按 `node_id` 顺序把监听 IP 一一分配出去，不会再让第一个节点把所有 IP 都占掉。
如果需要给单个节点手动指定监听地址，也可以在对应的 `/etc/heki/nodes/node_xxx.conf` 的 `[USER]` 区写 `listen_addr=...`。
这套能力除了默认自动拆分，还支持显式切回 `shared` 或强制 `split`，控制粒度会更高。

### 混合协议

不同节点可以使用不同协议。主配置中的 `server_type` 是启动探测提示和默认值；节点真实协议会在启动时按面板返回的节点配置自动识别。

主配置 `/etc/heki/heki.conf`：
```ini
type=xboard
server_type=anytls
panel_url=https://your-panel.com
panel_key=your-api-key
node_id=15619,15119
heki_key=your-heki-key
```

例如面板中节点 15619 是 AnyTLS、节点 15119 是 TUIC，重启后 heki 会分别按 AnyTLS / TUIC 启动这两个节点，单进程管理；不需要也不支持在 `node_xxx.conf` 的 `[USER]` 区手动写 `server_type` 覆盖协议。

也可以通过 `heki node add` 命令添加节点；协议仍以面板下发为准。

### 多出口说明

单进程多节点不等于只能共用一个出口。

- 一个节点可以在 `routes.toml` 里对接多个出口，按规则或随机方式使用
- 多个节点也可以各自用 `node_id:` 规则绑定不同出口
- 是否需要“一个节点”“三个节点”或“更多节点”，取决于你是想让`同一个入口节点`复用多个出口，还是想让`不同入口节点`固定对应不同出口

> 详细说明参考：[配置文档 - 混合协议说明](heki/heki-config.md)

---

## 方式二：多实例部署（systemd）

使用 systemd 模板服务 `heki@.service` 运行多个独立实例。

优点：进程隔离（一个节点崩溃不影响其他）、可使用不同面板、独立配置和日志。

适用场景：不同面板的节点、需要进程隔离。

> 命名实例目前只支持 systemd。Alpine / OpenRC 请使用单实例或 Docker 多容器部署。

### 实例名、服务名和目录的关系

下面都以实例名 `hk-a` 为例：

| 内容 | 对应值 |
|------|--------|
| heki 实例名 | `hk-a` |
| systemd 服务 | `heki@hk-a.service` |
| 主配置 | `/etc/heki/hk-a/heki.conf` |
| 自动生成的节点配置 | `/etc/heki/hk-a/nodes/node_<节点ID>.conf` |
| 默认文件日志 | `/etc/heki/hk-a/YYYY-MM-DD.log` |
| 路由、DNS 和名单文件 | `/etc/heki/hk-a/routes.toml`、`dns.yml`、`blockList`、`whiteList` |

实例名只允许字母、数字、点、下划线和短横线。`default`、`main`、`primary` 是默认实例的保留别名，不要用作新实例名。建议使用容易辨认的短名称，例如 `hk-a`、`us-02`，后续所有管理命令都使用同一个名称。

默认实例不是命名实例：默认实例仍使用 `heki.service` 和 `/etc/heki/heki.conf`，对应命令是 `heki status`、`heki log` 等，不需要加 `instance`。

### 创建实例

推荐直接使用管理脚本，不需要手动创建目录或 systemd 服务。

交互式创建：

```bash
heki instance add hk-a
```

无交互创建：

```bash
heki instance add hk-a type=xboard server_type=vless panel_url=https://panel-a.com panel_key=key-a node_id=1 heki_key=auth-a
heki instance add hk-b type=xboard server_type=vless panel_url=https://panel-b.com panel_key=key-b node_id=2 heki_key=auth-b
```

无交互模式至少需要 `type`、`server_type`、`panel_url`、`panel_key` 和 `node_id`。一个实例内也可以填写多个节点 ID：

```bash
heki instance add hk-a type=xboard server_type=vless panel_url=https://panel-a.com panel_key=key-a node_id=1,2,3 heki_key=auth-a
```

`server_type` 是启动探测提示和默认值，节点真正使用的协议仍以面板下发为准。XBoard 已下发的 Mieru `transport` 等协议参数不需要在主配置里重复填写。

创建完成后，`add` 会立即尝试启动实例，但不会自动设置开机自启。确认运行正常后执行：

```bash
heki instance enable hk-a
```

如果实例配置已经存在，`add` 会拒绝覆盖。需要重新生成已有实例配置时才使用 `setup`：

```bash
heki instance setup hk-a type=xboard server_type=vless panel_url=https://panel-a.com panel_key=key-a node_id=1 heki_key=auth-a
```

`setup` 会覆盖 `/etc/heki/hk-a/heki.conf`。带 `key=value` 的无交互 `setup` 会自动启动或重启实例；不带参数的交互式 `setup` 在实例已经运行时会询问是否重启，默认不重启。只修改一两个配置项时，优先使用后面的 `config` 命令。

> 命令行中的 `panel_key` 和 `heki_key` 可能被 shell 历史记录保存。在共享服务器上可以使用不带参数的交互式 `add/setup`，并避免把完整配置或命令历史发给他人。

### 创建后立即检查

新实例创建后，按下面的顺序检查：

```bash
# 1. 确认实例已发现、服务正在运行
heki instance list
heki instance status hk-a

# 2. 查看实例内的节点和面板下发后的运行参数
heki instance node hk-a list

# 3. 查看最近日志并持续跟踪
heki instance log hk-a
```

`heki instance status hk-a` 会显示实例状态、开机自启状态、配置文件路径、进程资源占用，以及已经生成的节点协议和监听端口。Proxy Protocol 如果写在节点配置的 `[USER]` 区，状态摘要会显示 `PP=ON`；如果写在实例主配置中，应通过后面的启动日志确认最终生效状态。

`heki instance node hk-a list` 中如果显示 `待启动` 或 `运行配置未就绪`，说明节点配置尚未成功从面板拉取。先重启实例，再查看启动日志：

```bash
heki instance restart hk-a
heki instance log hk-a
```

节点首次成功启动后，会生成类似下面的文件：

```text
/etc/heki/hk-a/nodes/node_1.conf
```

文件中的 `[AUTO]` 内容来自面板并会在实例启动时更新；本地覆盖项应写在 `[USER]` 标记之后。不要通过修改 `[AUTO]` 区强行改变面板下发的协议。

### 查看新实例日志

最简单的方式：

```bash
heki instance log hk-a
```

该命令会显示最近 100 行日志，然后持续显示新日志。按 `Ctrl+C` 只是退出日志查看，不会停止 heki 实例。如果实例内有多个节点，命令会提供按节点过滤的选项。

需要查看历史日志、指定时间范围或自行筛选时，直接使用对应的 systemd unit：

```bash
# 最近 200 行，不持续跟踪
journalctl -u 'heki@hk-a.service' -n 200 --no-pager

# 最近 100 行并持续跟踪
journalctl -u 'heki@hk-a.service' -f -n 100 --no-pager

# 当前系统启动以来的日志
journalctl -u 'heki@hk-a.service' -b --no-pager

# 最近 30 分钟
journalctl -u 'heki@hk-a.service' --since '30 min ago' --no-pager

# 指定时间段（按实际时间替换）
journalctl -u 'heki@hk-a.service' --since '2026-01-01 10:00:00' --until '2026-01-01 11:00:00' --no-pager
```

常用筛选示例：

```bash
# 只看某个节点
journalctl -u 'heki@hk-a.service' -n 500 --no-pager | grep -F '[Node 1]'

# 查警告、错误、超时和认证失败
journalctl -u 'heki@hk-a.service' -n 500 --no-pager | grep -Ei '\[WARN\]|\[ERROR\]|failed|timeout|unknown user'

# 检查协议识别、监听端口和 Proxy Protocol 是否生效
journalctl -u 'heki@hk-a.service' -n 500 --no-pager | grep -E 'auto-detected config|listening|Config saved|proxy_protocol|Proxy Protocol|failed'
```

如果使用默认的文件日志配置，命名实例的日志也会按天写入实例目录：

```bash
ls -lh /etc/heki/hk-a/*.log
tail -n 200 /etc/heki/hk-a/$(date +%F).log
tail -f /etc/heki/hk-a/$(date +%F).log
```

如果在 `heki.conf` 中显式配置了 `log_file_dir`，则以该目录为准。完整日志配置见：[日志文件管理](other/log-management.md)。

### 如何判断启动是否正常

不同协议的文字略有区别，但正常启动通常应依次看到：

1. 成功获取节点配置或用户列表。
2. `auto-detected config`，表示面板参数已经转换为运行配置。
3. `listening`、`Mux is listening` 或相近日志，表示端口已经监听。
4. `Config saved: /etc/heki/hk-a/nodes/node_1.conf`，表示运行配置保存到了当前实例目录。
5. 后续出现用户同步、流量或节点状态上报成功。

下面这些日志本身不是错误：

```text
Get user list success, users for this node: 123, online users: 0
Report node status success
```

它们表示面板通信成功；`online users: 0` 只表示当时没有检测到活跃用户。

如果客户端连接失败，可根据服务端是否出现连接日志快速分层：

| 现象 | 通常说明 |
|------|----------|
| 中转面板报 `dial tcp ... i/o timeout`，heki 没有对应连接迹象 | TCP 连接尚未建立，优先检查目标 IP、云防火墙、安全组、NAT 和中转配置 |
| 本机端口未监听 | 节点未启动成功、面板配置未拉取或端口绑定失败 |
| 出现 `unknown user` / authentication 错误 | 流量已到 heki，但客户端凭据或面板用户信息不匹配 |
| 出现 Proxy Protocol 解析错误 | 流量已到 heki，但前置没有按要求发送 Proxy Protocol，或发送的头部缺失、损坏、类型不匹配 |
| 用户列表和状态上报成功，但没有 `listening` | 面板 API 正常，协议服务本身没有完成启动 |

### 检查端口是否真的监听

先从状态或节点列表确认面板实际下发的端口，再检查 TCP / UDP：

```bash
heki instance status hk-a
heki instance node hk-a list

# TCP 监听，例如端口 47631
ss -lntp | grep ':47631'

# UDP 监听，例如 TUIC / Hysteria2
ss -lnup | grep ':47631'
```

看到 `LISTEN ... *:47631 ... heki` 只证明 heki 已在本机监听，不代表公网或中转机一定能访问。还需要从另一台机器测试：

```bash
nc -vz 203.0.113.10 47631
```

`203.0.113.10` 是文档示例地址，测试时必须替换成实际落地服务器的公网 IP 或域名。

如果外部测试超时而本机正在监听，重点检查云安全组、宿主机防火墙、目标公网 IP、NAT 端口映射和中转面板到落地机的网络路径。这种 TCP 建连前的超时与 Mieru 用户认证或 Proxy Protocol 解析无关。

### 配置、重启和节点管理

常用命令：

| 命令 | 作用 |
|------|------|
| `heki instance list` | 列出默认实例和 `/etc/heki/*/heki.conf` 中已发现的命名实例 |
| `heki instance status hk-a` | 查看状态、配置路径、进程和节点运行信息 |
| `heki instance start hk-a` | 启动实例 |
| `heki instance stop hk-a` | 停止实例 |
| `heki instance restart hk-a` | 重启实例，使配置和面板启动参数重新加载 |
| `heki instance log hk-a` | 查看最近日志并持续跟踪 |
| `heki instance enable hk-a` | 设置开机自启 |
| `heki instance disable hk-a` | 取消开机自启，不会立即停止实例 |
| `heki instance config hk-a` | 显示主配置，输出包含密钥，不要直接公开粘贴 |
| `heki instance config hk-a key=value` | 修改一个或多个主配置项，修改后需要重启 |
| `heki instance modify hk-a` | 交互式修改配置，也会显示包含密钥的当前配置 |
| `heki instance node hk-a list` | 查看该实例的节点 |
| `heki instance node hk-a add 2` | 向该实例添加节点 ID 2 |
| `heki instance node hk-a del 2` | 从该实例删除节点 ID 2 |
| `heki instance cert hk-a` | 管理该实例使用的 TLS 证书配置 |
| `heki instance reality hk-a show` | 查看该实例的 Reality 配置，会显示私钥，不要公开粘贴 |
| `heki instance reality hk-a gen` | 为该实例生成 Reality 密钥并询问是否重启 |

例如开启 TCP Proxy Protocol：

```bash
heki instance config hk-a proxy_protocol=true
heki instance restart hk-a
journalctl -u 'heki@hk-a.service' -b --no-pager | grep -E 'Proxy Protocol enabled|proxy_protocol=on'
```

Mieru TCP 支持 Proxy Protocol v1 和 v2；转发面板同时提供多种选项时，推荐选择 v2 TCP。只有协议和转发链路实际使用 UDP 时，才需要另外配置 `udp_proxy_protocol=true`。

`heki instance node hk-a del 2` 不能删除实例中的最后一个节点。节点增删命令会询问是否立即重启，选择不重启时，配置要到下一次 `heki instance restart hk-a` 后才生效。

### systemd 等价命令

管理脚本最终操作的是 `heki@hk-a.service`。当管理脚本输出不够详细时，可以直接使用：

```bash
systemctl status 'heki@hk-a.service' --no-pager -l
systemctl restart 'heki@hk-a.service'
systemctl enable 'heki@hk-a.service'
systemctl show 'heki@hk-a.service' -p MainPID -p ExecStart -p ActiveState -p SubState
```

确认模板服务实际读取的配置路径：

```bash
systemctl cat 'heki@.service'
```

正常的 `ExecStart` 应包含：

```text
/usr/local/heki/heki -c /etc/heki/%i/heki.conf
```

如果找不到 `heki@.service`，或 `ExecStart` 仍指向其他路径，请先更新/重新安装当前版本，再执行 `systemctl daemon-reload`。

### 常见问题快速排查

#### `Unit heki@hk-a.service not found`

说明 systemd 模板服务没有安装。确认文件存在：

```bash
ls -l /etc/systemd/system/heki@.service
systemctl daemon-reload
```

仍不存在时，重新运行当前版本安装脚本以补齐模板服务。

#### 实例启动后立刻退出

```bash
systemctl status 'heki@hk-a.service' --no-pager -l
journalctl -u 'heki@hk-a.service' -b -n 200 --no-pager
```

优先看日志最早出现的 `ERROR` / `failed`，常见原因是配置缺项、面板地址或密钥错误、节点不存在、端口被占用、证书文件不存在。

#### 新实例看不到日志

先确认实例名和服务名没有写错：

```bash
heki instance list
systemctl status 'heki@hk-a.service' --no-pager
journalctl -u 'heki@hk-a.service' -b --no-pager
```

`heki log` 查看的是默认 `heki.service`，不会显示 `hk-a` 的日志；命名实例必须使用 `heki instance log hk-a` 或 `journalctl -u heki@hk-a.service`。

#### 修改配置后没有生效

`heki instance config hk-a key=value` 只写入主配置，不会自动重启。执行：

```bash
heki instance restart hk-a
heki instance status hk-a
```

面板下发的协议参数要以启动后的 `node_*.conf` 和 `auto-detected config` 日志为准，不要只看主配置中的 `server_type`。

### 一台机器运行多个实例的建议

如果已经全部改用命名实例，建议停止并禁用默认实例，避免重复拉取同一个节点或抢占端口：

```bash
systemctl stop heki
systemctl disable heki
```

然后逐个确认命名实例：

```bash
heki instance list
heki instance status hk-a
heki instance status hk-b
```

每个实例可以连接不同的 `panel_url`、使用不同的 `panel_key` / `heki_key`，也可以在各自的 `node_id` 中运行多个节点。

### 实例目录隔离说明

多实例模式下，`nodes/` 不再固定共用一个目录。

- 默认实例使用 `/etc/heki/nodes/`
- 命名实例使用 `/etc/heki/<实例名>/nodes/`
- `routes.toml`、`dns.yml`、`blockList`、`whiteList` 默认跟随实例目录
- 日志文件和 IP 缓存默认也跟随当前实例配置目录

这可以避免同机多实例互相覆盖节点配置。协议识别逻辑本身没有改变。

证书配置项保存在各实例自己的 `heki.conf` 或节点 `[USER]` 区，但自动申请的证书文件仍统一存放在 `/etc/heki/certs/`，同域名实例会复用这套托管目录。

如果仍然需要手动创建实例，可以直接使用 systemd 模板，但必须使用相同的目录结构：

```bash
mkdir -p /etc/heki/instance1
vim /etc/heki/instance1/heki.conf
systemctl start heki@instance1
systemctl enable heki@instance1
journalctl -u heki@instance1 -f
```

---

## 方式三：多容器部署（Docker）

运行多个 Docker 容器，每个容器一个或多个节点。

优点：容器隔离、可使用不同面板、易于扩展和迁移。

适用场景：容器化环境、不同面板的节点。

```yaml
version: "3"
services:
  heki-node1:
    image: hekicore/heki:latest
    restart: on-failure
    network_mode: host
    environment:
      type: sspanel-uim
      server_type: v2ray
      panel_url: https://panel1.com
      panel_key: key1
      node_id: 1
      heki_key: your-heki-key
    volumes:
      - /etc/heki/node1/:/etc/heki/

  heki-node2:
    image: hekicore/heki:latest
    restart: on-failure
    network_mode: host
    environment:
      type: xboard
      server_type: anytls
      panel_url: https://panel2.com
      panel_key: key2
      node_id: 2
      heki_key: your-heki-key
    volumes:
      - /etc/heki/node2/:/etc/heki/
```
