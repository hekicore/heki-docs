# Docker 部署

## 安装 Docker

```bash
curl -fsSL https://get.docker.com | bash -s docker
systemctl start docker
systemctl enable docker
```

> 若安装失败，请参考 [Docker 官方文档](https://docs.docker.com/engine/install/)

---

## 镜像信息

| 项目 | 值 |
|------|-----|
| Docker Hub | `hekicore/heki` |
| 支持架构 | `linux/amd64`、`linux/arm64`（自动选择） |
| 标签 | `hekicore/heki:latest`（正式版）、`hekicore/heki:beta`（测试版）、`hekicore/heki:版本号` |

> 当前稳定版：`v1.2.6`；最近更新：`2026-09-06`。如需更新，请重新拉取 `hekicore/heki:latest`，或明确拉取 `hekicore/heki:1.2.6`。

---

## v1.2.6 更新说明

- 升级 GOST、Hysteria2、sing、TUIC、AnyTLS、VMess 和 Mieru 上游依赖及本地兼容补丁
- TUIC 支持可配置 QUIC 流控窗口、0-RTT、认证超时、心跳和空闲超时
- AnyTLS session 复用/重连与 VMess 空写入兼容性修复
- Mieru 新增低熵流量模式、用户发现缓存和 user hint 强制校验
- 已完成全协议连通性、配置兼容、race 和 8000 用户 soak 验证

---

## v1.2.5 更新说明

- 修复内置 Simple Obfs HTTP/TLS 握手占住 Accept 循环时，后续 SS 连接会批量超时断流的问题
- 默认 Simple Obfs 配置无需添加参数；HTTP/TLS 格式已对齐官方 simple-obfs，并通过真实 Mihomo 兼容测试
- 修复 Hysteria2 在线设备统计：同一客户端的多条 TCP stream / UDP session 只按唯一活跃 IP 计为 1 台设备，连接数单独保留在 `metrics.active_connections`
- Hysteria2 连接断开后会立即从在线 IP 集合移除，避免 TTL 快照残留导致 XBoard 设备数虚高
- 新增默认关闭的 ClickHouse 全量访问日志；与域名审计独立，不改变协议握手和转发行为
- 访问事件通过有界异步队列批量写入 ClickHouse，数据库故障、变慢和重试不会阻塞协议运行
- 支持自动建表、HTTP(S) Basic Auth、批次/刷新/超时参数和多节点覆盖；详见 [ClickHouse 访问日志](../other/access-log-clickhouse.md)

## v1.2.4 更新说明

- 新增默认关闭的域名访问审计，支持域名/IP/CIDR/glob/RE2 规则，并按节点和日期输出 JSONL 用户访问记录
- PPanel 优先使用当前 `heki.conf` 的 `server_type`，历史节点 hint 仅作回退，避免 AnyTLS 被误探测为 VLESS

- PPanel SSR 和结构化 SS 插件已接入；SSR HTTP / ticket obfs 与 Shadow-TLS v1 无密码链路已经通过真实握手和载荷传输回归
- XBoard / XiaoV2Board 下发的 `trusted_x_forwarded_for` 会应用到常用 HTTP 类传输，前置代理后的真实 IP 可继续用于在线统计和设备限制
- 使用 PPanel 的节点会按面板下发值覆盖 `push_interval`、`pull_interval` 和精确到字节的 `traffic_report_threshold`
- KCPTun 现在接收 `framesize`、`crypt=null` 和 `crypt=aes-128-gcm`

---

## 配置方式

Docker 部署支持两种配置方式（可混用，环境变量优先级高于配置文件）：

1. **环境变量**（`-e key=value`）：启动时自动读取，覆盖配置文件中的同名 key
2. **配置文件**（`-v /etc/heki/:/etc/heki/`）：挂载宿主机目录，在 `/etc/heki/heki.conf` 中写配置

### 必需配置项

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `type` | 面板类型 | `sspanel-uim` / `metron` / `xboard` / `v2board` / `xiaov2board` / `ppanel` / `heki-v1` |
| `server_type` | 后端协议类型 | `v2ray` / `vmess` / `vless` / `ss` / `ssr` / `trojan` / `hysteria` / `tuic` / `anytls` / `naive` / `mieru` |
| `panel_url` | 面板地址 | `https://your-panel.com` |
| `panel_key` | 面板通信密钥 | `your-api-key` |
| `node_id` | 节点 ID（多节点逗号分隔） | `1` 或 `1,2,3` |
| `heki_key` | 授权码（不填即免费版） | `your-heki-license-key` |

### 可选配置项

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `xboard_api_version` | `2` | XBoard API 版本，旧版 XBoard 需设为 `1` |
| `proxy_protocol` | `false` | TCP 入站是否接收 Proxy Protocol；Mieru TCP 也支持 |
| `udp_proxy_protocol` | `false` | SS / SSR 的 UDP relay、Mieru UDP 是否接收 Proxy Protocol v2 |
| `force_proxy_protocol` | `false` | 是否强制要求客户端必须发送 Proxy Protocol |
| `auto_out_ip` | `false` | 是否按入口本地 IP 绑定出站；多 IP / UDP / QUIC 场景建议配合 `listen=all` 或具体 IP 列表 |

### ClickHouse 访问日志

功能默认关闭。启用后，使用 HTTP(S) 接口将认证成功的访问事件异步批量写入远程 ClickHouse；ClickHouse 不可用时仅在后台重试或丢弃超出队列上限的日志，不会阻塞协议数据面。

```yaml
environment:
  access_log_enable: "true"
  access_log_clickhouse_url: "https://clickhouse.example.com:8443"
  access_log_clickhouse_database: heki
  access_log_clickhouse_table: heki_access_logs
  access_log_clickhouse_username: heki_writer
  access_log_clickhouse_password: "change-me"
  access_log_clickhouse_auto_create: "true"
```

数据库需要提前创建。自动建表账号需要 `CREATE TABLE` 和 `INSERT` 权限；预先建表后可关闭 `access_log_clickhouse_auto_create`，仅保留 `INSERT` 权限。完整表结构、TTL、查询和故障行为见 [ClickHouse 访问日志](../other/access-log-clickhouse.md)。

补充说明：
- `Mieru TCP` 开启 `proxy_protocol=true` 后，现在会在真正读取协议首包时再解析 Proxy Protocol，避免前置中转连接建立后迟迟不发头部时卡住后续连接；这类现象通常会表现为偶发握手超时、测速长时间 pending
- `Mieru UDP` 继续使用 `udp_proxy_protocol=true` 接收 Proxy Protocol v2 DGRAM；未开启对应开关时，`Mieru` 仍保持原有直连 listener 行为
- 单用户 `Mieru` 节点如果唯一有效用户因为过期、流量耗尽或面板禁用而被同步过滤，运行中 listener 会先正常关闭；只要同一个用户后续重新恢复有效，下一轮同步会自动重新拉起 listener，无需手动重启容器
- Mieru 直连目标侧失败（如 DNS 不存在、目标端口拒绝、IPv6 直连被系统拒绝）默认不输出 warning，避免客户端本机协议、Samba/NetBIOS、邮件、Apple Push、Windows Maps 等探测目标刷屏；route/block/非 direct 出站问题仍会保留结构化 warning

### xhttp / SplitHTTP 说明

- `xhttp` 现已支持，运行时会统一规范化为 `splithttp`
- 当前支持协议：`v2ray(vmess)`、`vless`、`trojan`、`anytls`
- 面板模式下，`VMess / VLESS / Trojan` 已支持面板下发 `xhttp`
- `AnyTLS` 运行时同样支持 `xhttp/splithttp`；但能否直接由面板完整下发，取决于上游面板是否返回完整的 `network/networkSettings`
- 本地直配或 Docker 调试环境下，可直接写 `vmess_transport=xhttp`、`vless_transport=xhttp`、`trojan_transport=xhttp`、`anytls_transport=xhttp`
- `splithttp/xhttp` 的内置监听器现已对齐普通 transport 语义：`listen` 留空时会按通配地址绑定，`localhost` 会自动归一化成本地回环；若误把域名写进监听地址，启动会返回明确错误而不是 panic
- `xhttp` 继续复用现有的 `*_h2_path` / `*_h2_host`，没有单独的 `*_xhttp_path` / `*_xhttp_host`
- 面板若下发 `network_settings.mode/extra`，会分别映射为运行时 `xhttp_mode` / `xhttp_extra`
- XBoard 常见默认模版里，`xhttp_extra` 的 `"16-32"`、`"8"`、`"true"` 这类字符串写法、`headers` 的数组形态（如 `[{\"name\":\"X-Test\",\"value\":\"1\"}, \"X-Trace: demo\"]`），以及默认模版里不完整的 `downloadSettings` 占位对象，都会自动兼容；但如果你显式写了完整 `downloadSettings` 且值非法，启动仍会直接报错
- `splithttp` 不能与 `proxy_protocol` 或 `mptcp` 同开；若前面有 nginx / caddy 做 TLS 卸载，才考虑 `force_close_ssl=true`

### VLESS flow 说明

- 普通 VLESS 节点不需要配置 `flow`；面板下发空值或 `flow=none` 时，heki 都会按“未启用 flow”处理
- 如果 PPanel 把普通 VLESS 节点写成 `flow=none`，heki 不会把它当作真实 flow，也不会触发 `VLESS flow mismatch: expected none, got`
- `xtls-rprx-vision` 仍然只适用于 Vision 节点，并且要求 `tcp + TLS/Reality`；不要在普通 TLS / WS / gRPC / xhttp VLESS 节点上配置 Vision flow

### AnyTLS ECH / fallback 说明

- AnyTLS 服务端现支持本地 `anytls_ech_server_keys`，也兼容面板下发的 `ech_server_keys / ech_key`
- `anytls_ech_server_keys` 需要填写 base64 编码的服务端 ECH keyset；启用后运行时会要求 TLS 1.3
- PPanel 的 `ech_enable / ech_server_name` 只表示面板元数据，不等于服务端 ECH keyset；没有真实 `ech_server_keys / ech_key` 时不会启用 ECH
- XBoard / XiaoBoard 的 `tls.ech.key` 只有在 `enabled=true / enable=true` 时才读取；`enabled=false` 时即使有残留 key 也不会启用
- AnyTLS 走 TLS 时，`cert_mode=self` 可以和 `anytls_ech_server_keys` 同时使用；ECH 不要求必须是公有 CA 证书
- 这条规则同时覆盖普通 TLS listener 和 `xhttp/splithttp` 的内置 TLS listener，不是只覆盖 `tcp/ws/h2/grpc`
- 如果你使用的是自签证书，客户端仍需开启 `allow_insecure`，或手动信任该自签证书；ECH 不会跳过证书校验
- `anytls_fallback_addr` 和 `anytls_fallback_port` 必须成对配置；只写其中一个时，容器启动会直接失败
- 如果配置了 fallback，启动日志会额外打印来源：`source=local` 表示来自本地配置，`source=panel` 表示来自面板私有字段兼容
- 启动时还会主动探测 fallback 目标是否可达；若你把 fallback 指到 `127.0.0.1:80` 但本机并没有监听，会提前打印 `unreachable at startup`
- 部分 `iOS` AnyTLS 客户端会把 `password hash` 与 `padding length` 分多次写入；heki 会按协议流式补齐读取，不会因为首包拆分而偶发报 `read padding length`

### TUIC ECH 说明

- TUIC 服务端现支持本地 `tuic_ech_server_keys`，也兼容面板下发的 `ech_server_keys / ech_key`
- PPanel 的 `ech_enable / ech_server_name` 只表示订阅侧元数据，不等于服务端 ECH keyset；没有真实 `ech_server_keys / ech_key` 时不会启用 ECH
- 如果面板当前无法下发真实 keyset，可在本地配置中写入：

```ini
tuic_ech_server_keys=BASE64_ECH_KEYSET
```

最小示例：

```ini
cert_mode=self
anytls_ech_server_keys=BASE64_ECH_KEYSET
```

### 多 IP / `auto_out_ip` / QUIC 说明

- 若你希望 `Hysteria2 / TUIC / Mieru / Naive / SS UDP / SSR obfs UDP` 在多 IP 服务器上稳定做到“哪个入口 IP 进来，就从哪个 IP 出去”，建议显式配置 `listen=all` 或具体 IP 列表，并同时开启 `auto_out_ip=true`
- 只要 `listen` 最终展开成明确的 `ListenAddrs`，上述协议都会按这些地址逐个启动 listener，不会只使用第一条地址
- 如果监听仍是空值、`0.0.0.0`、`::` 这类通配地址，尤其是 UDP/QUIC 场景，运行时仍可能拿不到明确入口本地 IP，此时 `auto_out_ip` 会回退到系统默认出口

> 完整配置参数：[heki 配置详解](heki/heki-config.md)

### 挂载目录

| 容器路径 | 用途 |
|----------|------|
| `/etc/heki/` | 主配置目录（heki.conf、证书、缓存等） |
| `/etc/heki/certs/` | ACME 自动申请的证书 |
| `/var/log/heki/` | 日志文件（可选） |

### 网络模式

Linux 下推荐使用 `network_mode: host`（或 `--network host`）：
- 自动映射同位端口，无需 `-p` 逐个映射
- 对 UDP 协议更省事；如果不用 host 网络，记得显式映射 UDP 端口
- 一些场景下更有利于减少额外 NAT 干扰

> macOS / Windows 不支持 Linux 语义的 host 网络，按端口映射方式部署即可

---

## 一、docker run 部署

```bash
docker run --restart=on-failure --name heki -d \
  -v /etc/heki/:/etc/heki/ --network host \
  -e type=sspanel-uim \
  -e server_type=v2ray \
  -e node_id=1 \
  -e heki_key=xxx \
  -e panel_url=https://your-panel.com \
  -e panel_key=your-api-key \
  hekicore/heki
```

> 反斜杠 `\` 后面不要有空格

### docker run 更新

```bash
# 更新到最新正式版
docker pull hekicore/heki:latest
docker stop heki && docker rm heki
# 重新执行上面的 docker run 命令（配置保留在 /etc/heki/ 中）

# 使用测试版 (beta)
docker pull hekicore/heki:beta
docker stop heki && docker rm heki
# 重新执行 docker run 命令，将镜像改为 hekicore/heki:beta

# 切换到指定版本 1.2.6
docker pull hekicore/heki:1.2.6
docker stop heki && docker rm heki
# 重新执行 docker run 命令，将镜像改为 hekicore/heki:1.2.6
```

---

## 二、docker-compose 部署

> 新版 Docker 已内置 `docker compose` 命令（V2），无需单独安装

### SSPanel 示例

```yaml
version: "3"
services:
  heki:
    image: hekicore/heki:latest
    restart: on-failure
    network_mode: host
    environment:
      type: sspanel-uim
      server_type: v2ray
      panel_url: https://your-panel.com
      panel_key: your-api-key
      node_id: 1
      # proxy_protocol: 'true'      # bool 值建议加单引号
      # udp_proxy_protocol: 'false'
      # force_proxy_protocol: 'false'
      # heki_key: xxx              # 不填即为免费版（88 人，全协议）
      # force_close_ssl: 'false'   # bool 值需加单引号
    volumes:
      - /etc/heki/:/etc/heki/
```

### XBoard 示例

```yaml
version: "3"
services:
  heki:
    image: hekicore/heki:latest
    restart: on-failure
    network_mode: host
    environment:
      type: xboard
      server_type: vless
      panel_url: https://your-xboard.com
      panel_key: your-server-token
      node_id: 1
      heki_key: your-heki-license-key
    volumes:
      - /etc/heki/:/etc/heki/
```

> 旧版 XBoard 如遇 404 错误，添加 `xboard_api_version: 1`

### XBoard + AnyTLS + Cloudflare DNS 自动证书

AnyTLS 的 TLS 模式需要证书；如果使用 AnyTLS Reality，则不需要额外的 `cert_file/key_file`。下面这份示例适合 `XBoard + AnyTLS TLS`，并由 heki 通过 Cloudflare DNS 自动申请证书：

```bash
docker run --restart=on-failure --name heki -d \
  -v /etc/heki/:/etc/heki/ --network host \
  -e type=xboard \
  -e server_type=anytls \
  -e panel_url=https://your-xboard.com \
  -e panel_key=your-server-token \
  -e node_id=1 \
  -e cert_domain=node1.example.com \
  -e cert_mode=dns \
  -e dns_provider=dns_cf \
  -e cert_key_length=ec-256 \
  -e DNS_CF_Email=your@email.com \
  -e DNS_CF_Key=your-cloudflare-api-key \
  hekicore/heki:latest
```

- `cert_mode=dns` 不占用 80 端口
- 如果要让 heki 自己处理 TLS 和自动申请证书，不要把 `force_close_ssl` 设为 `true`
- 只有在前面另挂 nginx / caddy 做 TLS 卸载时，才需要 `force_close_ssl=true`

### V2Board 示例

```yaml
version: "3"
services:
  heki:
    image: hekicore/heki:latest
    restart: on-failure
    network_mode: host
    environment:
      type: v2board
      server_type: trojan
      panel_url: https://your-v2board.com
      panel_key: your-api-key
      node_id: 1
      heki_key: your-heki-license-key
    volumes:
      - /etc/heki/:/etc/heki/
```

### PPanel 示例

```yaml
version: "3"
services:
  heki:
    image: hekicore/heki:latest
    restart: on-failure
    network_mode: host
    environment:
      type: ppanel
      server_type: vless
      panel_url: https://your-ppanel.com
      panel_key: your-secret-key    # ppanel 中的 secret_key
      node_id: 1                    # ppanel 中的 server_id
      heki_key: your-heki-license-key
    volumes:
      - /etc/heki/:/etc/heki/
```

### 多节点部署

一个容器运行多个节点，用逗号分隔 `node_id`：

```yaml
version: "3"
services:
  heki:
    image: hekicore/heki:latest
    restart: on-failure
    network_mode: host
    environment:
      type: xboard
      server_type: ss
      panel_url: https://your-panel.com
      panel_key: your-api-key
      node_id: "1,2,3"
      heki_key: your-heki-license-key
    volumes:
      - /etc/heki/:/etc/heki/
```

> 更多多节点方案（多容器、多实例）参考：[多节点与多实例部署](other/heki-multi-instance.md)

### docker-compose 常用命令

> 在 docker-compose.yml 同目录下执行

```bash
docker compose up -d                # 后台启动
docker compose up                   # 前台启动（观察日志）
docker compose logs --tail=500      # 查看最近 500 行日志
docker compose restart              # 重启
docker compose down                 # 停止并删除容器
```

### docker-compose 更新

```bash
# 更新到最新正式版
docker compose pull && docker compose up -d

# 使用测试版：将 docker-compose.yml 中的 image 改为 hekicore/heki:beta
# image: hekicore/heki:beta
docker compose pull && docker compose up -d

# 切换到指定版本 1.2.6：将 docker-compose.yml 中的 image 改为 hekicore/heki:1.2.6
# image: hekicore/heki:1.2.6
docker compose pull && docker compose up -d
```

---

## Docker 管理命令

### 查看日志

```bash
docker logs -f heki              # 实时日志
docker logs --tail 100 heki      # 最近 100 行
```

### 容器内管理

```bash
docker exec -it heki bash        # 进入容器
```

Docker 镜像内的 `heki` 是服务端二进制，不是宿主机安装版的管理脚本；容器内可直接使用的常用命令如下：

| 命令 | 说明 |
|---|---|
| `heki -h` | 查看二进制参数帮助 |
| `heki -v` | 查看版本 |
| `heki x25519` | 生成 Reality x25519 密钥对 |

节点增删、配置修改这类管理操作，建议直接修改宿主机挂载的 `/etc/heki/` 配置文件后重启容器。

### Docker 证书配置

HTTP 验证（需 80 端口）：

```yaml
environment:
  cert_domain: your-domain.com
  cert_mode: http
```

DNS 验证（Cloudflare 示例）：

```yaml
environment:
  cert_domain: your-domain.com
  cert_mode: dns
  dns_provider: dns_cf
  DNS_CF_Email: your@email.com
  DNS_CF_Key: your-cloudflare-api-key
```

> 在 Docker / docker-compose / `heki.conf` / `node_x.conf` 中，统一填写 `DNS_CF_Email` 和 `DNS_CF_Key`。

自签证书（无需域名）：

```yaml
environment:
  cert_mode: self
```

### docker 常用命令

```bash
docker ps                        # 查看运行中的容器
docker ps -a                     # 查看所有容器
docker logs <name>               # 查看日志
docker restart <name>            # 重启
docker stop <name>               # 停止
docker start <name>              # 启动
docker rm <name> -f              # 强制删除
```
