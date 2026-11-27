# 遇到问题如何排查错误

## 一、查看 Heki 日志

最简单的方法就是看日志，使用了哪些软件就查看哪些软件的日志，这里提供查看 heki 日志的方法

### 脚本安装的 Heki
使用`heki log`命令查看 heki 日志，观察日志是否有异常

### docker 安装的 Heki
使用`docker logs <镜像名>`查看 heki 日志，观察日志是否有异常

## 二、查看 Heki debug 日志

有时候默认日志等级(info)不足以判断问题所在，那么就需要设置 debug 日志等级

在配置文件中设置`log_level=debug`，使用 docker 则按 docker 的方式进行配置，并`重启 heki`

然后再根据上面的方法查看日志，此时日志内容将会更多，为判断问题提供帮助

## 三、排查其他地方

如果 heki 日志中看不出问题，则有可能问题出在其他地方，此时需要根据具体问题进行多方位排查

## 四、常见问题

### 启动失败
- 检查配置文件格式是否正确（key=value，每行一个）
- 检查 panel_url 是否以 http:// 或 https:// 开头
- 检查 panel_key 和 node_id 是否已填写
- 检查面板是否可以正常访问
- 如果日志里出现 `pprof enabled on ...`，说明调试接口已启动；若你自定义过 `pprof_addr` 或默认 `6060` 被占用自动回退，排查 `pprof` 时请以日志中的实际地址为准，不要只固定看 `127.0.0.1:6060`

### 内存或 goroutine 异常

如果表现为内存持续上涨、重启后恢复、goroutine 数量异常，优先按下面的文档采集 pprof：

- [内存与 pprof 排查](other/memory-troubleshooting.md)

### systemd 启动后立刻崩溃，日志里出现 `failed to create new OS thread` / `newosproc`
- 这类错误通常发生在 Go runtime 刚启动时，说明内核拒绝创建新线程；问题一般不在协议配置，而在宿主机的任务/进程上限
- 常见触发点包括：`systemd` 的 `TasksMax`、unit 的 `LimitNPROC`、容器或宿主机的 `pids.max`、以及当前 shell 的 `ulimit -u`
- 先看 unit 实际限制：

```bash
systemctl show heki -p TasksMax -p LimitNPROC
```

- 如果服务还没起来，也可以直接看 cgroup 的 PID 限制：

```bash
cat /sys/fs/cgroup/system.slice/heki.service/pids.max
```

- 机器上如果跑的是命名实例，把上面的 `heki` 换成 `heki@实例名`
- 临时修复可用 systemd drop-in 放开限制：

```bash
sudo systemctl edit heki
```

```ini
[Service]
LimitNPROC=infinity
TasksMax=infinity
```

- 保存后执行：

```bash
sudo systemctl daemon-reload
sudo systemctl restart heki
```

- 如果仍然报同样的错，再检查宿主机级限制：

```bash
ulimit -u
cat /proc/sys/kernel/threads-max
cat /proc/sys/kernel/pid_max
```

### NAT 机器能不能用
- 可以，NAT 机器不是 heki 的限制项
- 如果商家给你的外部端口和服务器内部监听端口不一致，请在面板里使用 `inside_port`
- 如果是脚本安装时报错，重点排查系统服务管理器和脚本依赖，不要把安装失败误判成 NAT 不支持

### Alpine / OpenRC 机器安装失败
- Alpine 支持 `OpenRC`，脚本安装的服务会自动落到 `/etc/init.d/heki`
- 如果系统里还没有 `bash`，先执行 `apk add --no-cache bash curl`
- 安装后可以直接用 `heki status`、`heki log`、`heki restart` 管理，脚本会自动适配 `OpenRC`
- 如果你想手动看日志，OpenRC 默认日志路径是 `/var/log/heki/heki.log`

### 用户无法连接
- 检查防火墙是否放行了对应端口
- 检查面板中节点配置是否正确
- 如果使用 TLS，检查证书是否配置正确
- 使用 `heki log` 查看是否有错误信息

### 证书申请失败
- HTTP 验证：确保 80 端口未被占用，域名已正确解析
- DNS 验证：确保 DNS 服务商配置正确，API 密钥有效
- 检查域名是否已完全生效（可使用 dig 或 nslookup 验证）

### 持续下载时套餐流量超额（AnyTLS 等协议）

Heki 在转发过程中按有效载荷持续累计本地流量，面板仍按 `push_interval` 和上报周期批量接收；用户移除前尚未采集的流量会保留到下次采集。

检查时请分别确认流量上报周期和用户同步周期。连续两次成功同步均确认用户失效或移除后，Heki 会主动关闭其已有会话；普通用户同步不应打断正常下载。面板处理、流量上报和用户同步仍有时间差，高速下载可能在这段时间内超出额度，不能把“60 秒同步”理解为字节级即时截断。

SSR 的 `ss_obfs_udp` 混淆单端口 UDP 使用节点共用密码，无法识别真实用户，因此不支持可靠的用户级 UDP 流量记账和额度踢线。有严格用户额度要求时，应关闭该模式或使用可鉴别用户的协议。

### Mieru TCP 连接数持续增长

先区分客户端到 Heki 的复用连接、Heki 到目标站点的出站连接，以及内核保留的 `TIME-WAIT`。可在 Linux 上查看状态分布和对应进程：

```bash
ss -Htan | awk '{count[$1]++} END {for (state in count) print state, count[state]}'
ss -Htanp state close-wait
ss -Htanp state fin-wait-2
```

- Mieru 客户端可以复用底层 TCP，因此业务请求数不等于 TCP socket 数；正常复用连接可能在请求结束后继续保留。
- Mieru 会话转发结束时，Heki 会关闭出站连接，并在底层 TCP 关闭时同步释放 socket。若仍有会话需要保留连接，应检查是否开启了额外的 TCP 回收策略；默认 `tcp_timeout=120` 的单位是分钟，`0` 表示不超时。
- 修改 Mieru 回收参数后重启对应实例。不要仅为了回收已结束会话而缩短所有长连接的超时；正常复用连接与异常连接堆积需要区分处理。
- `TIME-WAIT` 是 TCP 关闭后的内核状态，单凭数量较高不能判断应用连接泄漏。反馈时请附上 Heki 版本、客户端名称/版本、连接状态及增长发生在入站还是出站。

### 流量不上报

如果流量已上报，但面板扣量与服务器账单不同，先查看 [流量上报与服务器计费口径](other/traffic-accounting.md)，区分用户上传/下载、服务器入站/出站和节点倍率。

- 检查 panel_url 和 panel_key 是否正确
- 检查网络是否能正常访问面板
- 查看日志中是否有 API 请求错误

### XBoard 对接报 404 错误

**症状：** 日志中出现类似错误：
```
[ERROR] Heartbeat failed: POST /api/v2/server/status: HTTP 404
[ERROR] Heartbeat failed: POST /api/v1/server/UniProxy/status: HTTP 404
```

**原因分析：**
1. 当前对接的面板接口没有提供 `status` 端点
2. `status` 接口只用于节点状态监控，本身不是代理核心链路

**解决方案：**

**方案 1：面板已提供 `status` 端点时，保持默认配置**
- 默认走 `/api/v2/server/status`
- 可正常上报 CPU、内存、磁盘等节点状态数据

**方案 2：需要兼容 V1 路径时，使用 `xboard_api_version=1`**
```bash
# 配置文件方式
xboard_api_version=1

# Docker 方式
-e xboard_api_version=1

# docker-compose 方式
environment:
  xboard_api_version: 1
```

**方案 3：忽略错误**（不影响核心功能）
- `status` 接口只用于上报节点监控数据
- 不影响代理服务、用户连接、流量统计等核心功能
- 只是面板后台看不到节点状态监控数据

**验证方法：**
```bash
# 查看日志，确认其他接口是否正常
heki log

# 应该能看到用户同步/流量上报相关成功日志或对应的错误日志
# 这类周期性成功信息可能显示为 debug，不一定固定出现在 info
```

如果只有 `status` 接口报错，其他接口正常，说明代理功能完全正常。

### XiaoV2Board 返回 `server is not exist`

**症状：** 日志中出现类似错误：

```text
Failed to start node 7: get node info: get node config:
GET /api/v2/server/config?...node_type=v2node: HTTP 500, body: {"message":"server is not exist"}
```

**原因分析：**
1. 当前 `xiaov2board` 分支不支持 V2 `config` 接口
2. 这属于共享取配置入口问题，`ss`、`vless` 等协议都可能一起受影响

**当前行为：**
- heki 会自动识别这个错误，并把 `config` 请求切回 V1 `UniProxy`
- 日志会提示“面板不支持 V2 config API，已自动切换成 V1”

**如果希望固定走 V1：**

```bash
# 配置文件方式
xboard_api_version=1

# Docker 方式
-e xboard_api_version=1

# docker-compose 方式
environment:
  xboard_api_version: 1
```

### XBoard 下发了 `cert_mode=content`，但实际还是本地证书生效

**症状：** 面板已经下发了证书内容，但 heki 启动后仍然继续使用你本地写死的证书文件。

**当前行为：**
- heki 的证书优先级是 `本地手动证书 > 面板下发证书内容 > 自动申请证书`
- 只要当前节点已经显式配置了完整的本地证书对，面板 cert push 就不会覆盖它
- 这里的“本地手动证书”既包括通用 `cert_file/key_file`，也包括当前协议自己的证书项，例如 `vmess_cert_file`、`vless_cert_file`、`trojan_cert_file`、`anytls_cert_file`、`hysteria_cert_file`、`tuic_cert_file`、`naive_cert_file`

**排查方法：**
- 检查 `heki.conf` 的 `[USER]` 区是否已写入 `cert_file/key_file`
- 检查 `/etc/heki/nodes/node_{id}.conf` 的 `[USER]` 区是否覆盖了 `cert_file/key_file`
- 检查当前协议自己的证书项是否已填写完整

**补充说明：**
- `cert_mode=content` 表示面板直接下发 PEM 证书内容，不是 heki 本地自动申请模式
- heki 支持从 `cert_config` 或 `custom_config` 读取证书内容，兼容 `public_key/private_key`、`cert_content/key_content`、`cert/key` 等常见字段别名
- 如果你希望真正使用面板下发证书，需要先去掉本地显式配置的手动证书路径

### XBoard V2 `config` 响应缺少 `protocol`

**症状：** 日志中出现类似错误：

```text
get node info: get node config: cannot determine protocol type from config response
```

**当前行为：**
- 对 `v2board` / `xiaov2board` 这类可能不返回 `protocol` 的接口，heki 按对应的兼容逻辑处理
- 对 XBoard V2，payload 自身足够明确时，heki 会按字段特征推断真实协议
- payload 不够明确时，heki 会直接报错，避免把其它协议误判成 Shadowsocks

**解决方案：**
- 优先修正面板接口，确保 `config` 响应显式返回 `protocol`
- 如果是旧 `v2board` / `xiaov2board` 分支，按其原有兼容方式接入即可
- 如果是你自己魔改的 XBoard V2，建议对照官方返回格式补齐 `protocol`

### XBoard 的 SS 插件在客户端订阅里丢参数

如果 heki 节点已经正常启动，但客户端订阅里插件参数不完整，通常不是 heki 节点侧解析失败，而是 XBoard 订阅模板本身处理了 `plugin_opts`。常见模板里，`general/sagernet/v2rayn/v2rayng/passwall/ssrplus`、`shadowrocket`、`sing-box` 最稳，`meta` 次之；`clash/stash` 记得把布尔参数写成 `=true`；`surge/loon/quantumultx/surfboard/shadowsocks` 不适合作为完整 `gost` 主订阅。

详见：

- [XBoard 对接 Shadowsocks](ss/xboard-ss.md)
- [XBoard SS 插件订阅兼容与配置](ss/xboard-ss-subscription-fix.md)

### 如何更新到最新版本

```bash
# 一键安装方式 - 更新到最新正式版
heki update

# 一键安装方式 - 更新到最新测试版 (beta)
heki update beta

# 一键安装方式 - 安装指定版本
heki update 1.3.1

# 一键安装方式 - 切换到指定版本 1.3.1
heki update 1.3.1

# Docker 方式 - 更新到最新正式版
docker compose pull && docker compose up -d

# Docker 方式 - 使用测试版镜像
# 将 docker-compose.yml 中的 image 改为 hekicore/heki:beta
docker compose pull && docker compose up -d

# Docker 方式 - 切换到指定版本 1.3.1
# 将 docker-compose.yml 中的 image 改为 hekicore/heki:1.3.1
docker compose pull && docker compose up -d
```

> 测试版 (beta) 可能包含未完全验证的新功能，适合提前体验和测试。生产环境建议使用正式版。

### Docker 部署如何查看节点状态

```bash
# 查看日志
docker logs -f heki

# 进入容器查看状态
docker exec -it heki heki status
```
