# 1. 安装与配置

## 1.1 一键脚本安装
```
# 自动安装&更新最新正式版
bash <(curl -Ls https://raw.githubusercontent.com/hekicore/heki/master/install.sh)

# 安装指定版本
bash <(curl -Ls https://raw.githubusercontent.com/hekicore/heki/master/install.sh) x.x.x

# 安装最新测试版 (beta)
bash <(curl -Ls https://raw.githubusercontent.com/hekicore/heki/master/install.sh) --beta
```

### heki 管理命令
不带参数运行 `heki` 会打开交互式管理菜单；也可以运行 `heki help` 查看命令帮助。

#### 基础管理

- `heki start / stop / restart`：启动、停止、重启
- `heki status / log`：查看状态、日志
- `heki enable / disable`：设置、取消开机自启
- `heki version / help`：查看版本、命令帮助

#### 配置与节点

- `heki config`：查看配置
- `heki config k=v k2=v2`：快速修改配置项
- `heki modify / setup`：交互式修改配置、配置引导
- `heki node list / add <ID> / del <ID>`：查看、新增、删除节点

#### 多实例

- `heki instance list`：查看实例列表
- `heki instance add <N> [k=v ...] / setup <N> [k=v ...]`：新建、覆盖实例配置
- `heki instance start <N> / stop <N> / restart <N>`：启动、停止、重启实例
- `heki instance status <N> / log <N>`：查看实例状态、日志
- `heki instance enable <N> / disable <N>`：设置、取消实例开机自启
- `heki instance config <N> [k=v ...] / modify <N>`：查看、修改实例配置
- `heki instance node <N> [list|add|del] [node_id]`：管理实例内节点

#### 证书与 Reality

- `heki cert`：证书管理
- `heki reality`：Reality 密钥管理
- `heki reality gen / set / show`：生成、写入、查看 Reality 配置
- `heki x25519`：生成 x25519 密钥对

#### 更新与维护

- `heki update`：更新到最新正式版
- `heki update x.x.x / beta`：更新到指定版本、最新测试版
- `heki install / uninstall`：重新安装、卸载

### ① 使用 heki 命令自动配置
输出当前配置文件内容
```
heki config
```

自动配置`/etc/heki/heki.conf`，可填写`任意数量`的配置信息，示例：
```
heki config type=xboard server_type=ss node_id=1 heki_key=xxx panel_url=https://xxx.com/ panel_key=xxx
```

### ppanel 对接示例

ppanel 使用 `secret_key` 作为通信密钥（对应 heki 的 `panel_key`），使用 `server_id` 作为节点 ID（对应 heki 的 `node_id`）。

```
heki config type=ppanel server_type=vless node_id=1 panel_url=https://xxx.com/ panel_key=your-secret-key
```

> ppanel 支持的协议: v2ray(vmess)、vless、ss、trojan、hysteria、tuic、anytls、naive、mieru，不支持 SSR

### heki-v1 公共 WebAPI 对接示例

`heki-v1` 是 heki 对外公开的版本化 WebAPI，适合别人按文档自定义后端来适配 heki。

```
heki config type=heki-v1 server_type=vless node_id=1 panel_url=https://api.example.com/heki panel_key=your-api-key
```

详细协议说明见：[heki-v1 WebAPI 开发文档](../panel/heki-v1-webapi.md)

仓库内置参考后端和真实联调说明见：[heki-v1 参考后端与联调](../panel/heki-v1-example-server.md)

### ② 手动编辑配置文件
直接编辑`/etc/heki/heki.conf`文件，每行一个配置，以下为示例:

!> 建议直接在 Linux 下进行编辑，`不要在 Windows 下进行编辑`，否则可能会有 Windows 换行符`\r\n`导致的各种奇怪问题

```
type=xboard
server_type=v2ray
node_id=1
heki_key=xxx

# webapi 对接
panel_url=https://xxx.com/
panel_key=xxxx

# 其他配置可自行添加
```

## 1.2 Docker 安装
参考: [docker 对接教程](docker/docker-tutorial.md)

## 1.3 环境变量配置

heki 支持通过环境变量覆盖配置文件中的参数，环境变量优先级高于配置文件。适用于 Docker 部署场景：

```bash
docker run -e type=xboard -e server_type=ss -e node_id=1 -e panel_url=https://xxx.com/ -e panel_key=xxx ...
```

所有 `heki.conf` 中支持的配置项均可通过`同名环境变量`设置，环境变量名需直接使用配置 key 本身，通常就是小写，例如 `server_type`、`node_id`、`panel_url`、`dns_strategy`。

只有`证书 DNS 自动申请`所需的厂商密钥类环境变量才使用 `DNS_` 前缀，这些变量会被收集到证书配置里，例如：

```bash
docker run \
  -e type=xboard \
  -e server_type=trojan \
  -e node_id=1 \
  -e panel_url=https://xxx.com/ \
  -e panel_key=xxx \
  -e dns_strategy=ipv4_only \
  -e DNS_CF_Email=your@email.com \
  -e DNS_CF_Key=your-cloudflare-api-key
```

推荐统一约定：

- Docker / docker-compose 环境变量里写 `DNS_CF_Email`、`DNS_CF_Key`
- `heki.conf` 或 `node_x.conf` 的 `[USER]` 区也写 `DNS_CF_Email`、`DNS_CF_Key`
- heki 调用 acme.sh 时会自动去掉 `DNS_` 前缀，转换成 `CF_Email`、`CF_Key`

虽然直接把 `CF_Email` / `CF_Key` 传给容器时，acme.sh 也可能从进程环境里读到，但这不属于 heki 的配置层，容易和配置文件写法混淆，文档不推荐这样写。

## 1.4 pprof 调试端口

heki 内置了 `pprof` 调试接口，用于排查内存泄漏、goroutine 堆积、CPU 热点等问题。

默认行为：

- 默认监听 `127.0.0.1:6060`
- 默认端口被占用时，会自动回退到一个随机本地端口，并在日志里打印实际地址
- 如不需要，可直接关闭

配置参数：

| 参数名 | 默认值 | 说明 |
|---|---|---|
| `pprof_addr` | 空 | 留空时默认使用 `127.0.0.1:6060`；可显式指定其他本地地址端口；支持关闭 |

配置示例：

```ini
# 使用默认调试端口
pprof_addr=

# 自定义调试端口
pprof_addr=127.0.0.1:16060

# 关闭 pprof
pprof_addr=off
```

说明：

- 推荐只绑定在 `127.0.0.1`，不要直接暴露到公网
- `pprof` 不是业务协议端口，不影响 `SS / VMess / VLESS / Trojan` 这些协议本身的监听逻辑
- heki 当前会在业务监听成功后再启动 `pprof`，避免调试口先占住端口影响节点启动
- 如果你修改了 `pprof_addr`，后续排查时应以日志中打印的实际地址为准，不要只默认看 `6060`

---

# 2. 配置优先级

heki 采用三层配置，逐层覆盖：

```
面板 API（最高优先级）→ 协议、端口、传输层等由面板控制，本地无法覆盖
节点独立配置 [USER] 区 → 每个节点可单独调整的参数，重启后保留
heki.conf（最低优先级）→ 所有参数的全局默认值
```

## 2.1 主配置文件 heki.conf

路径：`/etc/heki/heki.conf`

所有节点共享的全局配置，包括面板对接信息、授权码、以及各参数的默认值。

## 2.2 节点独立配置

路径：`/etc/heki/nodes/node_{id}.conf`

每个节点启动后会自动生成独立的配置文件，文件分为两个区域：

- `[AUTO]` 区：每次启动自动更新，展示面板下发的协议、端口等信息，仅供参考，请勿手动修改
- `[USER]` 区：支持少量节点级覆盖参数，修改后重启 heki 即可生效，重启不会被覆盖

### 2.2.1 可在 [USER] 区修改的参数

首次生成的节点配置文件会包含以下默认参数模板。当前版本仅支持下表这些参数在 `[USER]` 区生效，其他键即使写入文件也不会覆盖运行时配置。

| 参数名 | 默认值 | 说明 |
|--------|-----|------|
| `listen_addr` | 无 | 节点独立监听 IP；设置后该节点只监听这个地址 |
| `proxy_protocol` | `false` | 是否启用 proxy protocol；Mieru TCP 也支持 |
| `udp_proxy_protocol` | `false` | 是否接收 UDP proxy protocol 头（ss/ssr/mieru UDP 可用） |
| `force_proxy_protocol` | `false` | 是否强制 proxy protocol |
| `force_close_ssl` | `false` | 关闭 heki TLS 处理，由外部 nginx 等处理 |
| `cert_file` | 无 | 节点独立证书文件路径 |
| `key_file` | 无 | 节点独立私钥文件路径 |
| `cert_domain` | 无 | 节点独立证书域名 |
| `cert_mode` | 无 | 证书方式：`http`/`dns`/`self`/`none` |
| `cert_key_length` | 无 | 证书密钥类型：推荐显式填写 `ec-256`/`ec-384`，留空时沿用自动申请默认行为 |
| `acme_server` | `letsencrypt` | ACME CA 选择；支持 `letsencrypt`、`zerossl` 或自定义 ACME directory URL |
| `dns_provider` | 无 | 节点独立 DNS 验证服务商代码，仅 `cert_mode=dns` 时使用 |
| `reality_private_key` | 无 | 节点独立 VLESS Reality 私钥，仅 Reality 模式生效 |
| `tuic_ech_server_keys` | 无 | 节点独立 TUIC 服务端 ECH keyset，base64 编码，仅 `server_type=tuic` 生效 |
| `mieru_user_hint_is_mandatory` | `false` | Mieru 是否强制要求客户端携带 user hint，仅 `server_type=mieru` 生效 |
| `check_interval` | `60` | 节点同步间隔，单位秒 |
| `submit_interval` | `60` | 提交数据间隔，单位秒 |
| `domain_audit_enable` | `false` | 该节点的域名访问审计开关；必须为 `true` 才记录，默认关闭 |
| `domain_audit_domains` | 空 | 该节点关注目标，逗号/换行分隔；支持域名/子域名、`域名:端口`、IP/CIDR，以及显式 `glob:`/`regexp:` 规则 |
| `domain_audit_log_dir` | 空 | 该节点审计 JSONL 目录；为空则使用主配置 `log_file_dir/audit` |
| `domain_audit_retention_days` | `7` | 该节点审计日志保留天数，`0`=永久 |
| `access_log_enable` | `false` | 该节点是否把全部成功访问事件写入 ClickHouse；与域名审计开关独立 |
| `access_log_clickhouse_url` | `http://127.0.0.1:8123` | ClickHouse HTTP(S) 接口地址，不是 native 9000 端口 |
| `access_log_clickhouse_database` | `default` | ClickHouse 数据库；数据库需提前创建 |
| `access_log_clickhouse_table` | `heki_access_logs` | 访问日志表名 |
| `access_log_clickhouse_username` | `default` | ClickHouse 写入用户 |
| `access_log_clickhouse_password` | 空 | ClickHouse 写入密码；不会写入启动日志或节点模板默认值 |
| `access_log_clickhouse_batch_size` | `500` | 单批最多写入事件数，范围 `1-10000` |
| `access_log_clickhouse_flush_interval` | `5` | 未满批次时的刷新间隔，秒 |
| `access_log_clickhouse_request_timeout` | `5` | 单次建表/写入请求超时，秒 |
| `access_log_clickhouse_auto_create` | `true` | 自动执行 `CREATE TABLE IF NOT EXISTS`；关闭后账号只需 INSERT 权限 |
| `tuic_initial_stream_window` | `2` | TUIC 单 stream 初始接收窗口，单位 MB，仅 `server_type=tuic` 生效 |
| `tuic_max_stream_window` | `6` | TUIC 单 stream 最大接收窗口，单位 MB，仅 `server_type=tuic` 生效 |
| `tuic_initial_conn_window` | `3` | TUIC 单连接初始接收窗口，单位 MB，仅 `server_type=tuic` 生效 |
| `tuic_max_conn_window` | `15` | TUIC 单连接最大接收窗口，单位 MB，仅 `server_type=tuic` 生效 |

> `force_close_ssl` 适用于 vmess/vless/trojan/anytls 等 TCP 协议，对 hysteria/tuic 无效（QUIC 内置 TLS）。Naive 当前内置实现需要 HTTP/2 over TLS，通常不要为 Naive 开启该项。
>
> `tuic_*_window` 这 4 个窗口参数不只是影响内存，也会影响 TUIC 高带宽场景的峰值速度。当前默认值 `2 / 6 / 3 / 15` 更偏向省内存；如果是 `1Gbps` 以上节点、用户机器配置较好、并且经常做单线程测速或高延迟大流量下载，建议结合下面 `3.4.10 TUIC` 的说明适当调大。
>
> `cert_mode=dns` 时，可在 `[USER]` 区继续写入 `DNS_*` 形式的环境变量，例如 `DNS_CF_Email`、`DNS_CF_Key`。运行时会自动转换为 acme.sh 需要的真实环境变量。
>
> 目前 `default_dns`、`dns_strategy`、`user_conn_limit`、`user_speed_limit`、`user_tcp_limit`、`forbidden_ports`、`sniff_redirect`、`log_level` 等参数仍需在主配置 `heki.conf` 中设置，写入 `[USER]` 区不会生效。
>
> 若节点配置文件已存在 `[USER]` 区，heki 会保留用户原有内容；当后续版本新增可在 `[USER]` 区生效的参数时，会自动以`注释模板`的形式补充缺失项，方便发现新能力，但不会覆盖你已有的设置。

### 2.2.2 多节点独立配置示例

主配置 `heki.conf` 中配置了 3 个节点：
```
node_id=250,251,252
server_type=ss
proxy_protocol=false
check_interval=60
```

在节点独立配置中为不同节点设置不同参数：

`/etc/heki/nodes/node_250.conf` 的 [USER] 区：
```
# ---- [USER] 用户自定义（修改这里，重启保留）----
proxy_protocol=true
udp_proxy_protocol=true
force_proxy_protocol=false
check_interval=30
submit_interval=60
```

`/etc/heki/nodes/node_251.conf` 的 [USER] 区单独指定监听地址：
```
# ---- [USER] 用户自定义（修改这里，重启保留）----
listen_addr=127.0.0.2
```

`/etc/heki/nodes/node_252.conf` 的 [USER] 区保持默认不修改。

效果：
- 节点 250：`server_type=ss`（主配置），`proxy_protocol=true`，`udp_proxy_protocol=true`，`check_interval=30`（节点覆盖）
- 节点 251：协议仍按面板自动识别，`listen_addr=127.0.0.2`（节点覆盖）
- 节点 252：`server_type=ss`，`proxy_protocol=false`，`check_interval=60`（全部回退到 heki.conf 默认值）

> 如果删除 [USER] 区中的某一行，该参数会回退到 heki.conf 中的全局默认值

域名访问审计也按同样的优先级工作。下面的配置让节点 251 单独记录出口 IP 查询目标，节点 250 和 252 保持关闭：

主配置 `heki.conf`：
```
node_id=250,251,252
domain_audit_enable=false
```

`/etc/heki/nodes/node_251.conf` 的 [USER] 区：
```
# ---- [USER] 用户自定义（修改这里，重启保留）----
domain_audit_enable=true
domain_audit_domains=api.ip.sb,ipwho.is,198.51.100.8:8899/ip
domain_audit_log_dir=/var/log/heki/node-251/audit
domain_audit_retention_days=7
```

效果：
- 节点 250、252：审计关闭，不写访问日志
- 节点 251：仅匹配上述 3 个目标，并写入 `/var/log/heki/node-251/audit/domain-audit-node-251-YYYY-MM-DD.jsonl`

也可以在主配置中统一开启，让所有节点继承同一组目标；某个节点若不需要记录，在对应 `[USER]` 区写 `domain_audit_enable=false` 即可。日志文件名包含节点 ID，因此多个节点共用同一个审计目录时也能区分来源。

审计文件使用每行一个事件的 JSONL 格式，稳定输出 `time`、`node_id`、`user_id`、`protocol`、`network`、`client_ip`、`target_host`、`target_ip`、`target_port`、`target`、`original_target`、`path`、`status` 和 `source`。其中 `target_host`/`target_port` 是用户请求的逻辑目标，`target_ip` 是成功出站连接的实际地址；TCP 成功连接记为 `connected`，UDP 首包成功写出记为 `written`。普通加密代理无法读取 HTTP 内部路径，因此 `path` 通常为空，不会把规则中的 `/ip` 当成真实访问路径。

ClickHouse 访问日志不使用 `domain_audit_domains` 过滤，适合集中检索全部成功访问。主配置中统一配置连接信息后，可在节点 `[USER]` 区只覆盖 `access_log_enable` 或表名；完整部署、表结构和查询示例见 [ClickHouse 访问日志](other/access-log-clickhouse.md)。

目标规则说明：

- `example.com`：匹配自身及子域名，端口不限。
- `example.com:443`：精确匹配域名和端口。
- `198.51.100.8`、`198.51.100.8:8899`：匹配 IP 或 IP+端口。
- `cidr:198.51.100.0/24`：匹配网段内的 IP，端口不限。
- `glob:check-*.example.com`、`glob:api.example.com:8*`：`*` 匹配任意字符，`?` 匹配单个字符。
- `regexp:^api[0-9]+\.example\.com:443$`：使用 Go RE2 正则，匹配规范化后的 `host:port` 或 host。

`regexp:` 和 `glob:` 是显式高级规则，不会改变普通域名的匹配语义。`domain_audit_domains` 使用逗号分隔规则，因此正则本身不能包含逗号；可改写为不含逗号的等价表达式。正则会在配置加载时校验并预编译，非法规则会阻止启动。

### 2.2.3 节点独立 force_close_ssl 示例

场景：主配置中 `force_close_ssl=false`（默认），但某个节点前面挂了 nginx 做 TLS 卸载，需要单独关闭该节点的 TLS 处理。

主配置 `heki.conf`：
```
node_id=300,301,302
server_type=trojan
force_close_ssl=false
```

`/etc/heki/nodes/node_300.conf` 的 [USER] 区：
```
# ---- [USER] 用户自定义（修改这里，重启保留）----
# 该节点前面有 nginx 做 TLS 卸载，关闭 heki 的 TLS 处理
force_close_ssl=true
```

效果：
- 节点 300：`force_close_ssl=true`（节点覆盖），heki 不申请证书、不加载 TLS，由 nginx 处理
- 节点 301/302：`force_close_ssl=false`（主配置默认），heki 正常处理 TLS 和证书

> `force_close_ssl` 对 hysteria/tuic 无效。QUIC 协议内置 TLS，无法由外部工具代理，即使设置为 `true` 也会被忽略并继续处理证书

### 2.2.4 节点独立证书配置示例

场景：主配置中所有节点共用同一个域名申请证书，但某个节点需要使用不同的域名。

主配置 `heki.conf`：
```
node_id=400,401
server_type=trojan
cert_domain=a.example.com
cert_mode=http
acme_server=letsencrypt
```

`/etc/heki/nodes/node_401.conf` 的 [USER] 区：
```
# ---- [USER] 用户自定义（修改这里，重启保留）----
# 该节点使用独立域名申请证书
cert_domain=b.example.com
cert_mode=http
cert_key_length=ec-256
acme_server=zerossl
```

效果：
- 节点 400：使用 `a.example.com` 申请证书（主配置，未显式指定密钥类型）
- 节点 401：使用 `b.example.com` 申请 ECC-256 证书（节点覆盖）

如果某个节点不需要自动申请证书（例如手动指定了证书文件，或由外部工具管理），可以设置 `cert_mode=none`：
```
# ---- [USER] 用户自定义（修改这里，重启保留）----
cert_mode=none
```

### 2.2.5 混合协议说明

heki 支持在同一实例中运行不同协议类型的节点。节点实际协议会在启动时按面板返回的配置自动识别，无需在 `node_xxx.conf` 的 `[USER]` 区手动填写 `server_type`。

支持的协议类型：`v2ray`(vmess)、`vless`、`ss`、`ssr`、`trojan`、`hysteria`、`tuic`、`anytls`、`naive`、`mieru`

---

# 3. 配置参数详解

## 3.1 基础配置（必填）

| 参数名 | 默认值 | 说明 |
|--------|-----|------|
| `type` | `sspanel-uim` | 面板类型：`sspanel-uim`/`metron`/`xboard`/`v2board`/`xiaov2board`/`ppanel`/`heki-v1` |
| `server_type` | 无（必填） | 后端协议：`v2ray`/`vmess`/`vless`/`ss`/`ssr`/`trojan`/`hysteria`/`tuic`/`anytls`/`naive`/`mieru` |
| `node_id` | 无 | 节点 id，多个以逗号分隔：`1,2,3` |
| `heki_key` | 无 | 授权码，不填即为免费版（88 人全协议，兼容 `license_key`） |
| `license_mode` | `auto` | 授权模式：`auto` 或 `offline-required` |
| `offline_license_b64` | 无 | 离线授权串，格式为 `base64(json(SignedLicense))` |

## 3.2 对接配置（必填）

| 参数名 | 默认值 | 说明 |
|--------|-----|------|
| `panel_url` | 无 | 面板 webapi 地址（兼容 `webapi_url`） |
| `panel_key` | 无 | webapi 通信密钥（兼容 `webapi_key`） |
| `xboard_api_version` | `2` | xboard API 版本，`1` 或 `2` |

## 3.3 网络与 DNS

### 3.3.1 网络配置

| 参数名 | 默认值 | 说明 |
|--------|-------|------|
| `listen` | 无 | 监听 IP；不填为通配监听，`all` 会枚举所有非 loopback 网卡 IP 并分别监听 |
| `listen_port` | `443` | 默认监听端口，一般由面板下发 |
| `multi_node_listen_strategy` | `auto` | 多节点监听策略：`auto` 会对同端口节点自动拆分监听 IP，兼容常见旧配置直接迁移；`shared` 为每个节点沿用整组 `listen` 地址；`split` 会按 `node_id` 顺序把多 IP 逐个分配给节点 |
| `tcp_timeout` | `120` | 空闲 TCP 超时，单位分钟，0=不超时 |
| `udp_timeout` | `2` | 空闲 UDP 超时，单位分钟，`0` 表示回退到协议默认值（当前为 2 分钟） |
| `mptcp` | `false` | 是否开启 MPTCP 监听 |

> 默认 `auto` 模式下，如果多个节点使用同一个监听端口，会自动按端口分组拆分 IP，避免第一个节点把整组 IP 全部占用，适合旧配置直接迁移。
>
> `listen` 仍然是监听 IP 的唯一来源。也就是说，多 IP 源进源出如果想稳定生效，仍建议显式配置 `listen=all` 或具体 IP 列表；`multi_node_listen_strategy` 只负责在这些监听 IP 上决定多节点如何分配。
>
> 当 `node_id=2,3,4` 且 `listen=1.1.1.1,2.2.2.2,3.3.3.3` 时，若设置 `multi_node_listen_strategy=split`，则节点会按顺序监听：
> Node 2 -> `1.1.1.1`
> Node 3 -> `2.2.2.2`
> Node 4 -> `3.3.3.3`
>
> `split` 模式要求可用监听 IP 数量不少于 `node_id` 数量；若想手动指定某个节点的监听 IP，也可以在对应 `node_xxx.conf` 的 `[USER]` 区写入 `listen_addr=...`。如果确实想保留整组共享监听行为，也可以显式设置 `multi_node_listen_strategy=shared`。
>
> 相比只有单一默认行为的方案，heki 还额外提供 `auto`、`shared`、`split` 三种模式以及节点级 `listen_addr` 覆盖，迁移更平滑，控制也更细。

### 3.3.2 DNS 配置

> 更多 dns 高级配置，例如流媒体解锁等：[dns 规则配置](other/dns-config.md)

| 参数名 | 默认值 | 说明 |
|--------|------|------|
| `default_dns` | 无 | 默认 DNS 地址，逗号分隔；支持 `udp`、`tcp://`、`tcp-tls://`、`https://`，不填用系统 DNS |
| `dns_cache_time` | `10` | DNS 缓存时间，单位分钟 |
| `dns_strategy` | `ipv4_first` | 解析策略：`ipv4_first`/`ipv4_only`/`ipv6_first`/`ipv6_only` |
| `dns_rules_file` | 同配置目录 `dns.yml` | 本地 DNS 规则文件路径；CLI `-d` 优先，其次使用这里的配置 |

> `dns_rules_file` 指向的规则文件优先级高于 `default_dns`；只有命中规则文件条目的域名才会使用条目内 DNS，其他域名仍走 `default_dns` 或系统 DNS。若面板下发了运行时 DNS 规则，面板规则会排在本地 `dns.yml` 前面。
>
> `dns_rules_file` 的实际优先级是：CLI `-d` > `heki.conf` 中的 `dns_rules_file` > `heki.conf` 同目录默认 `dns.yml`。

### 3.3.3 Proxy Protocol

> 详情参考：[中转获取真实 IP](other/forward-get-real-ip.md)

| 参数名 | 默认值 | 说明 |
|--------|-------|------|
| `proxy_protocol` | `false` | 启用 proxy protocol；Mieru TCP 也支持 |
| `udp_proxy_protocol` | `false` | 接收 UDP proxy protocol 头（ss/ssr/mieru UDP 可用） |
| `force_proxy_protocol` | `false` | 强制 proxy protocol，开启后必须中转，无法直连 |

## 3.4 协议配置

### 3.4.1 xhttp / SplitHTTP

`xhttp` 现已支持，运行时会统一规范化为 `splithttp`。面板下发和本地直配都可以继续写 `xhttp`，heki 启动时会自动转成内置的 `splithttp` listener。

- 当前支持协议：`v2ray(vmess)`、`vless`、`trojan`、`anytls`
- 当前已支持 `TLS` / `Reality` 组合；是否实际生效仍取决于对应协议和面板下发的安全类型
- 本地没有单独的 `*_xhttp_path` / `*_xhttp_host` 配置键；`xhttp` 继续复用现有的 `*_h2_path` / `*_h2_host`
- 面板模式下，直接让面板下发 `xhttp` 即可；本地直配或调试环境下，可手工写 `*_transport=xhttp` 或 `*_transport=splithttp`
- `AnyTLS + WebSocket/xhttp` 已补齐复用 stream 的 `SYNACK` 确认，页面停留后刷新 WS/探针不应再因为旧 session 复用超时而连续掉线重连

本地直配示例：

```ini
# VMess + TLS
server_type=v2ray
vmess_transport=xhttp
vmess_h2_path=/vmess-xhttp
vmess_h2_host=vmess.example.com
vmess_enable_tls=true
vmess_cert_file=/etc/ssl/private/fullchain.pem
vmess_key_file=/etc/ssl/private/privkey.pem
```

```ini
# VLESS + Reality
server_type=vless
vless_transport=xhttp
vless_h2_path=/vless-xhttp
vless_h2_host=reality.example.com

reality_private_key=YOUR_PRIVATE_KEY
reality_dest=www.microsoft.com:443
reality_server_name=reality.example.com
reality_short_id=0123456789abcdef
```

```ini
# Trojan + TLS
server_type=trojan
trojan_transport=xhttp
trojan_h2_path=/trojan-xhttp
trojan_h2_host=trojan.example.com
cert_file=/etc/ssl/private/fullchain.pem
key_file=/etc/ssl/private/privkey.pem
```

```ini
# AnyTLS + TLS
server_type=anytls
anytls_transport=xhttp
anytls_h2_path=/anytls-xhttp
anytls_h2_host=anytls.example.com
anytls_sni=anytls.example.com
anytls_cert_file=/etc/ssl/private/fullchain.pem
anytls_key_file=/etc/ssl/private/privkey.pem
```

当前限制：

- `splithttp` 不能与 `proxy_protocol` 同开，因此也不要再叠加 `force_proxy_protocol`
- `splithttp` 不能与 `mptcp=true` 同开
- 如果前面有 nginx / caddy 做 TLS 卸载，才考虑 `force_close_ssl=true`；否则保持默认 `false`

### 3.4.2 V2Ray / VMess

| 参数名 | 默认值 | 说明 |
|--------|-------|------|
| `v2ray_reduce_memory` | `false` | VMess Legacy MD5 降低内存占用；启用后客户端时间误差建议控制在 `±15s` 内 |
| `v2ray_fallback_addr` | 无 | 回落地址，需同时设 `tls_alpn=http/1.1` |
| `v2ray_fallback_port` | 无 | 回落端口 |
| `force_vmess_aead` | `false` | 强制 VMessAEAD，alterId 将被忽略；若客户端订阅仍保留 `alterId` 字段，建议同时在面板输出中直接删除该字段 |
| `force_vmess_md5` | `false` | 强制旧版 VMessMD5，适合明确兼容 legacy md5 的客户端 |
| - | | |
| `vmess_aead_invalid_access_enable` | `false` | 错误密码攻击优化 |
| `vmess_aead_invalid_access_count` | `30` | 错误次数 |
| `vmess_aead_invalid_access_duration` | `60` | 统计时间，单位秒 |
| `vmess_aead_invalid_access_forbidden_time` | `600` | 禁用时间，单位秒 |

### 3.4.3 Trojan

| 参数名                  | 默认值 | 说明                                         |
|----------------------|-----|--------------------------------------------|
| `trojan_remote_addr` | 无   | trojan 回落地址，若开启，则同时需设置 `tls_alpn=http/1.1` |
| `trojan_remote_port` | 无   | trojan 回落端口                                |

### 3.4.4 Shadowsocks (SS)

> 详情参考: [ss 密码单端口优化](other/ss-aead.md)

| 参数名 | 默认值 | 说明 |
|--------|-------|------|
| `ss_decrypt_concurrency` | `8` | AEAD 密钥遍历并发限制，防止用户量大时 CPU 爆满 |
| `ss_invalid_access_enable` | `false` | 是否启用错误密码攻击优化 |
| `ss_invalid_access_count` | `30` | 错误次数 |
| `ss_invalid_access_duration` | `60` | 统计时间，单位秒 |
| `ss_invalid_access_forbidden_time` | `600` | 禁用时间，单位秒 |

#### SS Obfs 配置

| 参数名 | 默认值 | 说明 |
|--------|---------|------|
| `ss_obfs_mode` | `relaxed` | `relaxed`/`strict`/`strict_path`/`strict_host` |
| `ss_obfs_path` | `/` | 服务端 obfs path，`strict` 或 `strict_path` 时生效 |
| `ss_obfs_host` | 无 | 服务端 obfs host，`strict` 或 `strict_host` 时生效 |

> `strict` 模式下客户端 path 和 host 必须与服务端一致，`relaxed` 不检查

### 3.4.5 ShadowsocksR (SSR)

#### SSR 混淆单端口

| 参数名           | 默认值              | 说明                            |
|---------------|------------------|-------------------------------|
| `mu_suffix`   | `microsoft.com`  | 需和面板配置相同，默认无需修改               |
| `mu_regex`    | `%5m%id.%suffix` | 需和面板配置相同，默认无需修改               |
| `ss_obfs_udp` | `false`          | 是否开启混淆单端口 udp，注意无法统计用户 udp 流量 |

#### SSR 协议单端口

| 参数名             | 默认值    | 说明                                          |
|-----------------|--------|---------------------------------------------|
| `ssr_cid_limit` | `true` | 旧版 SSR 单端口参数，现在通常不用改。限制同一用户可使用的 IP/设备数量时，优先看面板下发的 `device_limit`；面板没有下发时，再使用主配置里的 `user_conn_limit` |

### 3.4.6 AnyTLS

| 参数名               | 默认值 | 说明              |
|-------------------|-----|-----------------|
| `anytls_sni`      | 无   | AnyTLS SNI 域名（一般从面板自动获取）   |
| `anytls_cert_file`| 无   | AnyTLS 证书文件路径（支持自动申请，配置 cert_domain + cert_mode 即可）   |
| `anytls_key_file` | 无   | AnyTLS 密钥文件路径   |
| `anytls_ech_server_keys` | 无 | AnyTLS 服务端 ECH keyset，base64 编码；启用后要求 TLS 1.3 |
| `anytls_fallback_addr` | 无 | 回落地址，认证失败时将连接转发到此地址（防探测/防主动检测） |
| `anytls_fallback_port` | `0` | 回落端口，需与 `anytls_fallback_addr` 配合使用 |
| `anytls_padding_scheme` | 无 | 自定义 padding scheme（base64 编码），留空使用默认。一般无需修改 |
| - | | |
| `anytls_invalid_access_enable` | `false` | 是否启用防暴力破解（认证失败 IP 自动封禁） |
| `anytls_invalid_access_count` | `30` | 触发封禁的失败次数 |
| `anytls_invalid_access_duration` | `60` | 失败次数统计窗口，单位秒 |
| `anytls_invalid_access_forbidden_time` | `600` | 封禁时长，单位秒 |

> `anytls_ech_server_keys` 只在 TLS 模式下生效，要求服务端最终使用 TLS 1.3；若你显式把 `tls_max_version` 限制在 `1.2`，启动会直接报错而不是静默降级。
>
> `anytls_fallback_addr` 和 `anytls_fallback_port` 现在必须成对配置，只写其中一个会在启动前明确报错。
>
> 如果 fallback 来自面板私有字段，启动日志会额外标记 `source=panel`；如果来自本地配置，则标记 `source=local`。这只是排查辅助信息，不代表官方面板已经统一了 AnyTLS fallback server-config 字段。

### 3.4.7 VLESS Reality

!> Reality 参数通常由面板自动下发，无需手动配置。仅在需要本地覆盖时使用

| 参数名                    | 默认值 | 说明                                                    |
|------------------------|-----|-------------------------------------------------------|
| `reality_private_key`  | 无   | Reality 服务端私钥（x25519），可通过 `heki reality gen` 生成         |
| `reality_dest`         | 无   | Reality 回落目标，如 `www.microsoft.com:443`                 |
| `reality_server_name`  | 无   | Reality 允许的 SNI                                        |
| `reality_short_id`     | 无   | Reality Short ID                                       |

### 3.4.8 Naive

| 参数名                | 默认值    | 说明                                    |
|--------------------|--------|---------------------------------------|
| `naive_enable_tls` | `true` | 是否启用 TLS，Naive 协议默认需要 TLS              |
| `naive_cert_file`  | 无      | Naive TLS 证书文件路径                       |
| `naive_key_file`   | 无      | Naive TLS 密钥文件路径                       |
| `naive_server_name`| 无      | Naive TLS SNI 域名                       |

> Naive 当前可用路径是 `HTTP/2 CONNECT over TLS`。面板下发 `tls=0` / `security=none` 时 heki 会解析该字段，但内置 Naive 处理器不会提供完整的明文 HTTP/2 CONNECT 服务，实际使用请保持 TLS 开启。

### 3.4.9 Hysteria2

!> Hysteria2 基于 QUIC/UDP 协议，必须配置 TLS 证书

| 参数名                       | 默认值     | 说明                                                    |
|---------------------------|---------|-------------------------------------------------------|
| `hysteria_up_mbps`        | `0`     | 上行带宽限制，单位 Mbps，0 表示使用 BBR                             |
| `hysteria_down_mbps`      | `0`     | 下行带宽限制，单位 Mbps，0 表示使用 BBR                             |
| `hysteria_obfs_type`      | 无       | 混淆类型，可选: `salamander`，留空不混淆                            |
| `hysteria_obfs_password`  | 无       | 混淆密码                                                  |
| `hysteria_server_name`    | 无       | TLS SNI 域名（一般从面板自动获取）                                  |
| `hysteria_cert_file`      | 无       | TLS 证书文件路径（支持自动申请，配置 cert_domain + cert_mode 即可）       |
| `hysteria_key_file`       | 无       | TLS 密钥文件路径                                             |
| `hysteria_allow_insecure` | `false` | 客户端兼容字段，服务端忽略；自签证书场景需要客户端自行开启不安全连接                |
| `hysteria_disable_udp`    | `false` | 是否禁用 UDP 转发                                            |

> `hysteria_up_mbps / hysteria_down_mbps` 是 Hysteria2 自身的带宽参数；另外通用的 `user_speed_limit`、`node_speed_limit` 也会对 Hysteria2 生效。

### 3.4.10 TUIC

!> TUIC V5 基于 QUIC/UDP 协议，必须配置 TLS 证书

| 参数名                       | 默认值   | 说明                                                    |
|---------------------------|-------|-------------------------------------------------------|
| `tuic_congestion_control` | `cubic` | 拥塞控制算法，可选: `bbr`、`cubic`、`new_reno`；若面板显式下发 `congestion_control`，则按面板值生效 |
| `tuic_alpn`               | `h3`  | ALPN 协议列表，多个以逗号分隔，如 `h3,h3-29`                        |
| `tuic_server_name`        | 无     | TLS SNI 域名（一般从面板自动获取）                                  |
| `tuic_cert_file`          | 无     | TLS 证书文件路径（支持自动申请，配置 cert_domain + cert_mode 即可）       |
| `tuic_key_file`           | 无     | TLS 密钥文件路径                                             |
| `tuic_ech_server_keys`    | 无     | TUIC 服务端 ECH keyset，base64 编码；面板下发 `ech_server_keys` 时会自动接入，启用后要求 TLS 1.3 |
| `tuic_allow_insecure`     | `false` | 客户端兼容字段，服务端忽略；自签证书场景需要客户端自行开启不安全连接                |
| `tuic_disable_udp`        | `false` | 是否禁用 UDP 转发                                          |
| `tuic_zero_rtt_handshake` | `true` | 是否启用 0-RTT 握手；未显式填写时按运行时默认 `true`                    |
| `tuic_max_idle_time`      | `15`  | QUIC 连接最大空闲时间，单位秒；`0` 表示使用默认值 `15`                  |
| `tuic_auth_timeout`       | `3`   | 认证超时时间，单位秒；`0` 表示使用默认值 `3`                          |
| `tuic_heartbeat`          | `10`  | 心跳间隔，单位秒；`0` 表示使用默认值 `10`                           |

#### TUIC QUIC 内存优化

TUIC/Hysteria2 等基于 QUIC 的协议，每个用户连接都需要在程序内存中维护流量控制缓冲区（TCP 协议由内核管理，不占用程序内存）。

当前 heki 仅对 `TUIC` 暴露了可调的 QUIC 流控窗口参数；Hysteria2 暂未提供对应配置项，继续使用其库默认窗口。

在 TUIC 上，可以通过以下参数在不明显影响正常使用的前提下显著降低内存占用：

| 参数名 | 默认值 | 说明 |
|--------|------|------|
| `tuic_initial_stream_window` | `2` | 单 stream 初始窗口，单位 MB |
| `tuic_max_stream_window` | `6` | 单 stream 最大窗口，单位 MB |
| `tuic_initial_conn_window` | `3` | 单连接初始窗口，单位 MB |
| `tuic_max_conn_window` | `15` | 单连接最大窗口，单位 MB |

!> 这 4 个参数会直接影响 TUIC 在高延迟链路上的峰值吞吐。当前默认值 `2 / 6 / 3 / 15` 是偏省内存的默认档，不是偏大带宽的默认档；如果是 `1Gbps` 口、用户机器配置较好，单线程测速或单流大文件下载时，默认值在 `80ms - 120ms` RTT 区间内就可能先把速度卡在大约 `300 - 600Mbps`。

QUIC 内存占用对比：

| 配置方案 | 每用户内存 | 100 用户 | 500 用户 | 适用场景 |
|--------|---------|---------|---------|--------|
| QUIC 协议默认 | ~16MB | ~1.6GB | ~8GB | - |
| heki 默认 | ~4-5MB | ~400-500MB | ~2-2.5GB | 绝大多数面板场景 |
| 极限省内存 (1/2/2/4) | ~2-3MB | ~200-300MB | ~1-1.5GB | 小内存 VPS、用户量大 |

QUIC 调优建议：
- 默认值适合绝大多数面板分发场景（用户限速 ≤300Mbps，RTT ≤200ms）
- 如果 VPS 内存紧张（如 512MB/1GB），可以进一步调小：`tuic_initial_stream_window=1`、`tuic_max_stream_window=2`、`tuic_initial_conn_window=2`、`tuic_max_conn_window=4`
- 如果用户有高带宽需求（如 `500Mbps - 1Gbps` 单用户测速、不限速下载、高延迟跨洲线路），建议先调到：`tuic_initial_stream_window=8`、`tuic_max_stream_window=16`、`tuic_initial_conn_window=16`、`tuic_max_conn_window=32`
- 如果主要是 `1Gbps+` 节点的高延迟大流量场景，仍感觉单流测速偏低，再继续往上加；原则上单流上限约等于 `tuic_max_stream_window / RTT`，单连接总上限约等于 `tuic_max_conn_window / RTT`
- 窗口过小会限制高延迟链路的峰值吞吐（公式：最大吞吐 ≈ 窗口大小 / RTT），但对正常网页浏览和视频观看影响极小

### 3.4.11 Mieru

| 参数名 | 默认值 | 说明 |
|--------|--------|------|
| `mieru_transport` | `TCP` | Mieru 传输协议，可选: `TCP`、`UDP` |
| `mieru_traffic_pattern` | 无 | Base64 编码的 mieru `TrafficPattern` protobuf；本地填写时可作为覆盖值 |
| `mieru_user_hint_is_mandatory` | `false` | 是否强制要求客户端携带 user hint；默认关闭以兼容旧版或第三方 Mieru 客户端，多用户节点如需避免 hint 未命中时遍历所有用户尝试解密可设为 `true` |
| `mieru_multiplexing` | `MULTIPLEXING_LOW` | 兼容保留的客户端侧多路复用偏好；当前 heki 服务端不消费该值 |

!> `mieru_multiplexing` 是客户端侧多路复用偏好，当前 heki 服务端不消费该参数，因此不建议作为服务端配置项使用。

?> 如果 Mieru 前面有中转层需要传递真实 IP，`mieru_transport=TCP` 时使用 `proxy_protocol=true`；`mieru_transport=UDP` 时使用 `udp_proxy_protocol=true`，前置转发端必须发送 Proxy Protocol v2 DGRAM 头。

## 3.5 TLS 与证书

### 3.5.1 TLS 配置

| 参数名 | 默认值 | 说明 |
|--------|---------|------|
| `tls_alpn` | `h2,http/1.1` | TLS ALPN，多协议逗号分隔 |
| `tls_min_version` | 空 | TLS 最低版本：`1.0`/`1.1`/`1.2`/`1.3` |
| `tls_max_version` | 空 | TLS 最高版本 |
| `tls_prefer_server_cipher_suites` | `true` | 优先使用服务器密码套件 |
| `tls_cipher_suites` | 空 | 自定义加密套件 |

### 3.5.2 证书配置

> `若开启 tls，则必须配置证书`
>
> heki 支持四种方式配置证书，`任选其一`即可
>
> 另外，`cert_mode=none` 可显式关闭自动证书申请；若已配置手动证书路径，仍会照常加载，适用于节点独立配置中覆盖主配置的证书行为
>
> 对接 XBoard 时，面板运行时还可能下发 `cert_mode=content`。这表示面板直接给出 PEM 证书内容，heki 会先把它安装到本地托管目录，再按正常 TLS 路径加载；它不是 `heki.conf` 里推荐手写的本地自动申请模式。运行时优先级为 `本地手动证书 > 面板下发证书内容 > 自动申请证书`。

#### ① 自定义证书文件路径

| 参数名         | 默认值 | 说明     |
|-------------|-----|--------|
| `cert_file` | 无   | 证书文件路径 |
| `key_file`  | 无   | 密钥文件路径 |

#### ② HTTP 验证自动申请证书

- 申请证书时需要`临时占用 80 端口`
- 确保域名已解析到本服务器的 IP，并且已`完全生效`
- 若申请证书的域名开启 CDN，则必须确保 CDN 不会跳转 https，否则推荐 dns 验证

| 参数名               | 默认值 | 说明                                           |
|-------------------|-----|----------------------------------------------|
| `cert_domain`     | 无   | 域名                                           |
| `cert_mode`       | 无   | 必填: `http`                                   |
| `cert_key_length` | 无   | 推荐显式填写 `ec-256` 或 `ec-384`；留空时沿用 acme.sh 默认行为 |
| `acme_server`     | `letsencrypt` | 可选：`letsencrypt`、`zerossl` 或自定义 ACME directory URL |

ZeroSSL HTTP 验证示例：
```
cert_domain=your-domain.com
cert_mode=http
cert_key_length=ec-256
acme_server=zerossl
```

使用前提：

- `cert_domain` 必须替换为`已解析到当前服务器`的真实域名
- 申请过程中 `80` 端口需要可被 ACME CA 直接访问
- 若域名走 CDN / 反代，请确保 `http://your-domain.com/.well-known/acme-challenge/...` 不会被强制跳转到 https

#### ③ DNS 验证自动申请证书

- 支持一百多种 DNS 服务商
- 此配置方式较复杂，但最通用

| 参数名               | 默认值 | 说明                                 |
|-------------------|-----|------------------------------------|
| `cert_domain`     | 无   | 域名                                 |
| `cert_mode`       | 无   | 必填:dns                             |
| `cert_key_length` | 无   | 推荐显式填写 `ec-256` 或 `ec-384`；留空时沿用 acme.sh 默认行为 |
| `acme_server`     | `letsencrypt` | 可选：`letsencrypt`、`zerossl` 或自定义 ACME directory URL |
| `dns_provider`    | 无   | DNS服务商名称                           |
| `DNS_xxx`         | 无   | 需要配置的邮箱、密钥等                        |

CloudFlare 配置示例：
```
cert_domain=xxx.com
cert_mode=dns
cert_key_length=ec-256
acme_server=zerossl
dns_provider=dns_cf

DNS_CF_Email=xxx@xx.com
# 此处填写 CloudFlare Global Key
DNS_CF_Key=xxxxx
```

DNSPod 配置示例：
```
cert_domain=xxx.com
cert_mode=dns
cert_key_length=ec-256
acme_server=zerossl
dns_provider=dns_dp

DNS_DP_Id=111
DNS_DP_Key=xxxxx
```

其它的 DNS 服务商都能在这个页面找到：https://github.com/acmesh-official/acme.sh/wiki/dnsapi

配置要点：

- 搜索 DNS 提供商的名称，并找到命令中`--dns dns_xxx`的内容，这个`dns_xxx`就是你要填的，例如：`dns_cf`
- 再看 DNS 提供商所需要配置的内容，`区分大小写`，一般都是邮箱、API 密钥之类的，例如：`CF_Email`、`CF_Key` 等。加上 **DNS_** 前缀，则在 heki 配置中写为 `DNS_CF_Email`，`DNS_CF_Key`
- 配置正确后 heki 会自动使用 acme.sh 申请证书

#### ④ 自签证书（cert_mode=self）

- 适用于 TUIC、Hysteria2 等 QUIC 协议，不需要真实域名证书
- 生成 ECDSA P-256 自签证书，有效期 10 年，存放在 `/etc/heki/certs/self-signed/`
- 客户端需开启「允许不安全连接」（allow_insecure / skip-cert-verify）
- 适合无域名、纯 IP 部署、或通过转发面板中转的场景

| 参数名               | 默认值 | 说明                                 |
|-------------------|-----|------------------------------------|
| `cert_domain`     | 无   | 填写域名或 IP（用于证书 CN/SAN 字段）         |
| `cert_mode`       | 无   | 必填: `self`                         |

配置示例：
```ini
# TUIC 使用自签证书（无需真实域名）
cert_mode=self
```

> 面板配置了 `server_name` 时，heki 会自动将其作为 `cert_domain`。如果面板未配置 `server_name`，需要手动在 heki.conf 中设置 `cert_domain`。

## 3.6 用户与限制

### 3.6.1 用户配置

| 参数名 | 默认值 | 说明 |
|--------|-------|------|
| `user_conn_limit` | `0` | 用户 IP/设备数限制，0=不限。若面板下发了 `device_limit`，优先使用面板值 |
| `user_tcp_limit` | `0` | 用户 TCP 并发连接数限制，0=不限 |
| `user_speed_limit` | `0` | 用户限速 Mbps，0=不限。面板下发值取较低，Hysteria2 也会生效 |
| `node_speed_limit` | `0` | 节点总限速 Mbps，0=不限，Hysteria2 也会生效 |
| `user_ip_limit_cidr_prefix_v4` | `32` | IPv4 CIDR 前缀，如 `24` 则同 /24 视为同一 IP |
| `user_ip_limit_cidr_prefix_v6` | `128` | IPv6 CIDR 前缀，作用同上 |

### 3.6.2 增强 IP/设备数限制（Redis）

> 详情查看介绍：[查看](other/limit-ip-and-device-num.md)

| 参数名                 | 默认值     | 说明                           |
|---------------------|---------|------------------------------|
| `redis_enable`      | `false` | 是否开启 Redis 增强 IP/设备数限制        |
| `redis_addr`        | 无       | redis 地址，格式: `aaa.com:12345` |
| `redis_password`    | 无       | redis 密码                     |
| `redis_db`          | `0`     | redis 数据库编号，默认 0，无需更改        |
| `redis_tls`         | `false` | 是否使用 TLS 连接 Redis            |
| `conn_limit_expiry` | `60`    | 缓存在线 IP 的时间，单位：秒             |
| `redis_timeout_ms`  | `300`   | Redis 查询/记录超时，单位：毫秒；超时后自动降级到本地限制 |

### 3.6.3 动态限速

> 详情查看介绍：[查看](other/dy-limit.md)

| 参数名 | 默认值 | 说明 |
|--------|-------|------|
| `dy_limit_enable` | `false` | 动态限速总开关 |
| `dy_limit_duration` | 无 | 限速时间段，留空=全天 |
| `dy_limit_trigger_time` | `60` | 触发限速时间，秒 |
| `dy_limit_trigger_speed` | `100` | 触发阈值，Mbps |
| `dy_limit_speed` | `30` | 限速后速度，Mbps |
| `dy_limit_time` | `600` | 限速持续时间，秒 |
| `dy_limit_white_user_id` | 无 | 白名单用户 id，逗号分隔 |

### 3.6.4 用户 IP 缓存

> ss 密码单端口查看：[ss 密码单端口优化](other/ss-aead.md)
> 
> VMessAEAD 查看：[VMessAEAD 优化](other/vmess-aead.md)

| 参数名 | 默认值 | 说明 |
|--------|------|------|
| `ip_user_cache_time` | `1` | IP 缓存时间，单位小时 |
| `ip_user_cache_save_enable` | `true` | 全局在线 IP 缓存自动保存到硬盘；VMess 认证 IP 缓存也会持久化 |
| `ip_user_cache_save_dir` | `/etc/heki/` | 缓存保存目录 |

## 3.7 规则与路由

### 3.7.1 审计规则

> 详情查看：[查看](other/block-list-config.md)

| 参数名              | 默认值 | 说明                                                    |
|------------------|-----|-------------------------------------------------------|
| `block_list_file` | 同配置目录 `blockList` | 本地审计规则文件路径；CLI `-b` 优先，其次使用这里的配置 |
| `block_list_url` | 无   | 从 URL 加载审计规则，轮询间隔与 `check_interval` 相同；留空则从本地文件加载 |

### 3.7.2 白名单规则

> 详情查看：[查看](other/white-list.md)

| 参数名              | 默认值 | 说明                                                     |
|------------------|-----|--------------------------------------------------------|
| `white_list_file` | 同配置目录 `whiteList` | 本地白名单文件路径；CLI `-w` 优先，其次使用这里的配置 |
| `white_list_url` | 无   | 从 URL 加载白名单规则，轮询间隔与 `check_interval` 相同；留空则从本地文件加载 |

### 3.7.3 多路由多出口负载均衡

> 详情查看：[查看](other/routes-config.md)

| 参数名          | 默认值 | 说明                                                   |
|--------------|-----|------------------------------------------------------|
| `routes_file` | 同配置目录 `routes.toml` | 本地路由配置文件路径；CLI `-r` 优先，其次使用这里的配置 |
| `routes_url` | 无   | 从 URL 加载路由配置，固定每 1 分钟轮询；留空则从本地文件加载 |

> `block_list_file` / `white_list_file` / `routes_file` 的实际优先级分别是：CLI `-b/-w/-r` > `heki.conf` 对应配置项 > `heki.conf` 同目录默认文件（`blockList` / `whiteList` / `routes.toml`）。
>
> `blockList` / `whiteList` 本地文件修改后约 10 秒内会自动重载；若配置了对应的 `*_url`，该项规则将优先使用远程内容而不再从本地文件读取。`routes_url` 为独立的远程路由配置，使用 Heki 自己的 `routes.toml` 格式。

### 3.7.4 Geo 文件

| 参数名 | 默认值 | 说明 |
|--------|------|------|
| `geo_update_enable` | `false` | 自动更新 geosite/geoip 文件 |
| `geo_update_interval` | `24` | 更新间隔，小时 |
| `geo_site_url` | GitHub 默认 | geosite.dat 下载地址 |
| `geo_ip_url` | GitHub 默认 | geoip.dat 下载地址 |

## 3.8 其它配置

| 参数名 | 默认值 | 说明 |
|--------|---------|------|
| `check_interval` | `60` | 节点同步间隔，秒 |
| `submit_interval` | `60` | 提交数据间隔，秒 |
| `force_close_ssl` | `false` | 关闭 heki TLS，由外部 nginx 等处理 |
| `forbidden_bit_torrent` | `true` | 禁止 BT 下载 |
| `auto_update` | `false` | 每天自动检查更新稳定版 |
| `log_level` | `info` | 日志等级：`debug`/`info`/`warn`/`error` |
| `log_file_dir` | `/etc/heki/` | 日志目录，空或 `false` 不保存文件 |
| `log_file_retention_days` | `7` | 日志保留天数，0=永久 |
| `domain_audit_enable` | `false` | 域名访问审计总开关，默认关闭；设为 `true` 后才记录关注目标 |
| `domain_audit_domains` | 空 | 关注域名或 `IP:端口` 目标，逗号/换行分隔；命中后记录用户访问线索 |
| `domain_audit_log_dir` | `log_file_dir/audit` | 域名审计 JSONL 目录；空则使用日志目录下的 `audit` |
| `domain_audit_retention_days` | `7` | 域名审计日志保留天数，0=永久 |
| `access_log_enable` | `false` | 是否把全部认证后的成功访问事件异步写入 ClickHouse；与域名审计独立 |
| `access_log_clickhouse_url` | `http://127.0.0.1:8123` | ClickHouse HTTP(S) 地址，不支持 native 9000 端口 |
| `access_log_clickhouse_database` | `default` | ClickHouse 数据库名，需提前创建 |
| `access_log_clickhouse_table` | `heki_access_logs` | ClickHouse 表名 |
| `access_log_clickhouse_username` | `default` | ClickHouse 用户名 |
| `access_log_clickhouse_password` | 空 | ClickHouse 密码 |
| `access_log_clickhouse_batch_size` | `500` | 批量写入条数，范围 `1-10000` |
| `access_log_clickhouse_flush_interval` | `5` | 批量刷新间隔，秒 |
| `access_log_clickhouse_request_timeout` | `5` | ClickHouse HTTP 请求超时，秒 |
| `access_log_clickhouse_auto_create` | `true` | 是否自动创建访问日志表 |
| `auto_out_ip` | `false` | 源进源出；按入口本地 IP 绑定出口，多 IP 服务器建议配合 `listen=all` 或明确 IP 列表 |
| `domain_sniff` | `tls,http,quic` | 域名探测协议；仅当客户端目标本身是 IP 时才尝试从首包探测，空=不探测 |
| `sniff_redirect` | `false` | 探测到域名后重新解析 IP，解析优先级为 `面板运行时 DNS > dns.yml > default_dns > 系统 DNS` |
| `forbidden_ports` | 无 | 禁止代理端口，如 `25,465,1-100` |
| `ban_private_ip` | `false` | 禁止代理内网 IP |
| `detect_packet` | `false` | 审计规则检测明文数据包 |
| `detect_packet_max_len` | `4096` | 检测最大长度（字节） |
| `submit_alive_ip_min_traffic` | `0` | 在线 IP 上报阈值流量，单位 KB。仅当用户在当前上报周期内流量达到该阈值时，才上报其在线 IP |
| `submit_traffic_min_traffic`  | `0` | 流量上报阈值，单位 KB。当前上报周期内流量低于该值的用户不提交流量数据 |

> `force_close_ssl` 适用于 TCP 协议（vmess/vless/trojan/anytls 等），不适用于 QUIC 协议（hysteria/tuic）。Naive 当前内置实现需要 HTTP/2 over TLS，通常不要开启该项。
>
> `auto_out_ip=true` 并不等于所有场景都能拿到明确入口 IP。TCP 入口通常可以直接从连接本地地址识别入口 IP；但如果入口监听的是通配地址（如留空、`0.0.0.0`、`::`），尤其在 UDP/QUIC 场景下，可能拿不到明确本地 IP，此时会回退到系统默认出口。

---

# 4. 内存优化

heki 针对代理服务的内存使用做了多层优化，默认配置即可显著降低内存占用，无需额外操作。

如需进一步调优，可通过环境变量控制，详见：[运行时性能调优](other/performance-optimize.md)
