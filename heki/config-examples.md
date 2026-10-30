# 复杂配置实例

下面按使用场景给出配置。域名、节点 ID、通信密钥和证书路径均需换成自己的值；用户账号仍从面板获取。主配置、节点配置与面板下发字段的区别见 [配置优先级](heki/heki-config.md#_2-配置优先级)。

## 写之前先确认位置和格式

| 位置 | 用途 | 生效方式 |
|---|---|---|
| `heki.conf` | 面板信息、全局默认值、协议本地补充参数 | 修改后重启 Heki |
| Docker Compose 的 `environment` | 同名小写配置键，覆盖主配置文件值 | 修改后 `docker compose up -d` 重建容器；只 restart 不会更新环境变量 |
| `nodes/node_123.conf` 的 `[USER]` 区 | 仅支持文档列出的节点覆盖项 | 在自动生成的完整标记行下修改，然后重启 Heki |
| 面板的协议/传输配置 | 控制节点端口、network、TLS 类型及订阅内容 | 保存面板配置后重启 Heki，必要时刷新客户端订阅 |

主配置使用一行一个 `key=value`；注释另起一行，不要写 `参数=值 # 注释`。普通值无需引号，节点 `[USER]` 区也不要给值加引号。`xhttp_extra`、`network_settings` 这类面板 JSON 字段不能直接当成 `heki.conf` 键使用。

默认节点目录为 `/etc/heki/nodes/`；多实例使用各自 `-c` 指定的配置文件同目录下的 `nodes/`。修改 `[AUTO]` 区会被启动过程覆盖。

## Mieru：两台节点采用不同回收策略

假设同一面板的节点 101、102 都是 Mieru TCP。主配置先保持默认不额外回收：

```ini
type=xboard
server_type=mieru
panel_url=https://panel.example.com
panel_key=YOUR_PANEL_API_KEY
node_id=101,102
mieru_handshake_timeout=0
mieru_empty_timeout=0
mieru_tcp_idle_timeout=0
```

首次启动生成节点文件后，在 `nodes/node_101.conf` 原有标记行下面填写以下三项。保留文件其他内容，不要新建一个裸 `[USER]` 节：

```ini
# ---- [USER] 用户自定义（修改这里，重启保留）----
mieru_handshake_timeout=30s
mieru_empty_timeout=6m30s
mieru_tcp_idle_timeout=0
```

重启后：101 会清理迟迟不建立会话的连接和会话全部结束后的空连接；102 未设覆盖，继续使用主配置的全关闭策略。101 仍有业务会话时，即使暂时没数据，也不会因为这两项空连接策略被关闭。

如果主配置已启用回收，而某个节点需要关闭，必须在该节点填写 `0`；删除该节点参数表示重新继承主配置，不代表关闭。

三项参数不设置连接数上限，不用于 Mieru UDP 底层传输。`mieru_tcp_idle_timeout` 若非零，至少为 `1m`，还可能关闭仍有静默会话的连接，详见 [三个参数的区别](mieru/xboard-mieru.md#mieru-tcp-连接回收配置)。

## Mieru：Docker 配置示例

```yaml
services:
  heki:
    image: hekicore/heki:1.2.9
    restart: unless-stopped
    network_mode: host
    environment:
      type: xboard
      server_type: mieru
      panel_url: https://panel.example.com
      panel_key: YOUR_PANEL_API_KEY
      node_id: "101"
      mieru_handshake_timeout: "30s"
      mieru_empty_timeout: "6m30s"
      mieru_tcp_idle_timeout: "0"
    volumes:
      - /etc/heki:/etc/heki
```

这是 Linux 主机上的 host 网络示例，监听端口由面板下发。若已有 `/etc/heki/nodes/node_101.conf` 节点超时覆盖，它仍会优先于这些全局环境变量；排查“改了没生效”时要同时检查该文件。只想用默认策略时，把三项设为 `"0"`，并检查节点覆盖。

```bash
docker compose up -d
docker compose logs --tail=100 heki
```

Mieru 的 `traffic_pattern` 和 `user_hint_is_mandatory` 是另一类配置：面板明确下发时优先于本地值。不要把三项超时的覆盖规则套用到它们。开启 user hint 强制校验前，要确认现有客户端都支持，否则缺少 hint 的客户端无法连接。

## VMess：WS + TLS 参数如何配套

先在面板设置 VMess、WS、TLS，路径 `/vmess`，Host/SNI 为 `node.example.com`。订阅也应使用相同值。下面列出对应的完整后端示例；面板已下发的字段一般无需重复写：

```ini
type=xboard
server_type=vmess
panel_url=https://panel.example.com
panel_key=YOUR_PANEL_API_KEY
node_id=201
vmess_transport=ws
vmess_ws_path=/vmess
vmess_ws_host=node.example.com
vmess_enable_tls=true
vmess_cert_file=/etc/heki/certs/fullchain.pem
vmess_key_file=/etc/heki/certs/privkey.pem
```

证书需覆盖 `node.example.com`，路径指向真实文件。切换 HTTP Upgrade 时使用 `vmess_transport=httpupgrade`，仍用 `vmess_ws_path` / `vmess_ws_host`。切换 gRPC 时改用 `vmess_transport=grpc` 与 `vmess_grpc_service_name=heki-grpc`，客户端的 serviceName 必须一致；不能只改后端而保留旧 WS 订阅。

VLESS、Trojan、AnyTLS 对应字段见 [协议传输参数表](heki/heki-config.md#_34-协议配置)。这类字段不能写进节点 `[USER]`。VMess AEAD 订阅应直接删除 `alterId`，legacy MD5 则明确使用 `alterId>0`，详见 [VMess 说明](other/vmess-aead.md)。

## VLESS：Reality + Vision 与 UDP

在面板设置 VLESS、TCP、Reality、`flow=xtls-rprx-vision`，配好 Reality 的目标站点、SNI、密钥和 Short ID。然后使用：

```ini
type=xboard
server_type=vless
panel_url=https://panel.example.com
panel_key=YOUR_PANEL_API_KEY
node_id=301
```

客户端从面板订阅取得对应公钥、SNI、Short ID 和 flow，使用支持 XUDP 的客户端即可转发 UDP。无需给此组合申请普通 TLS 证书，也不需要额外“开启 UDP 修复”参数。用户与路由限制仍会生效。

Vision 只适用于 TCP + TLS/Reality，不能与 WS、gRPC 或 XHTTP 同时开启。普通 VLESS + XHTTP 应使用空 flow 或 `none`。

`vless_encryption=none` 是普通 VLESS 的兼容设置；启用新版 VLESS Encryption 的服务端入口是 `vless_decryption`。应从面板生成与客户端配套的密钥配置，不能把客户端 encryption 字符串直接当服务端私钥使用，也不要复制文档里的占位密钥上线。参见 [VLESS Encryption](vless/xboard-vless.md#vless-encryption-服务端入口)。

## SS：V2Ray Plugin 与 Shadow-TLS 的不同

插件会改变外层握手，服务端与订阅客户端必须支持同一种插件、参数和版本。单纯修改后端不会给客户端自动补插件字段。

V2Ray Plugin WebSocket + TLS 的本地补充项：

```ini
ss_plugin=v2ray-plugin
ss_plugin_opts=mode=websocket;host=ss.example.com;path=/ss;tls
cert_file=/etc/heki/certs/fullchain.pem
key_file=/etc/heki/certs/privkey.pem
```

这些参数加入现有 `server_type=ss` 的主配置，SS 算法和用户密码仍需与面板一致。`tls` 是插件选项里的无值开关，`path` 不是文件路径。客户端需要相同 path/host，并信任服务端证书。

Shadow-TLS v3 则是另一种外层握手方式，不能与上面的 WebSocket 配置一起照抄：

```ini
ss_obfs=shadow_tls
ss_shadow_tls_version=3
ss_shadow_tls_password=REPLACE_WITH_SHARED_SHADOWTLS_PASSWORD
ss_shadow_tls_server=www.microsoft.com:443
```

这里的密码是 Shadow-TLS 密码，不是 SS 用户密码。v2/v3 必须填写并与客户端一致，v1 不使用该密码。握手服务器需要从节点可达且支持对应握手，不要求为 Heki 申请该域名的证书。面板下发了版本或握手服务器时按实际面板字段处理。PPanel 和 XBoard 插件默认值可能不同，建议明确指定版本。

内置插件与需要外部进程的区别见 [XBoard SS 插件](ss/xboard-ss.md)、[PPanel SS 插件](ss/ppanel-ss.md)。Restls 并不会因为解析了插件参数就自动提供内置服务端。

## AnyTLS：回落和 Padding

在已可用的 AnyTLS TLS 节点主配置中，可增加成对回落参数：

```ini
anytls_fallback_addr=127.0.0.1
anytls_fallback_port=8080
```

回落目标须事先部署，地址端口不能指回同一个 Heki 监听器。回落用于未通过 AnyTLS 认证的连接，不是正常用户的路由出站，也不保证能伪装所有失败握手。只填地址或只填端口会启动报错。

Padding 默认规则通常无需调整。确需自定义时，先按 AnyTLS 支持的语法准备规则文本，再将完整文本 Base64 编码后放进单行 `anytls_padding_scheme=`；也支持单行 JSON 数组/对象。不要在 `heki.conf` 中直接粘贴多行规则，否则每行会被当作不同配置键。面板也可以下发 padding_scheme，本地显式填写时优先使用本地值。

ECH 需要成对的服务端 keyset 与客户端 ECH 配置，且使用 TLS 1.3；它不代替证书信任。示例和字段范围见 [AnyTLS ECH](anytls/xboard-anytls.md#anytls-ech-说明)。

## TUIC：空闲时间、心跳与窗口不是一回事

在现有 TUIC 主配置中，常规时间参数可按默认值显式写为：

```ini
tuic_auth_timeout=3
tuic_heartbeat=10
tuic_max_idle_time=15
tuic_disable_udp=false
```

这里是**整数秒**，不要写成 Mieru 风格的 `10s`。auth_timeout 是等待认证的时间，heartbeat 是心跳周期，max_idle_time 是 QUIC 连接空闲期限。三项写 `0` 会恢复各自默认值，**不表示关闭超时**。面板明确下发 auth_timeout/heartbeat 等字段时优先使用面板值。

`tuic_disable_udp=true` 只禁止代理 UDP 数据报；TUIC 的底层 QUIC 仍然需要服务器 UDP 端口可达。Hy2 的 `hysteria_disable_udp` 同样不能让 QUIC 变成 TCP 监听。

窗口影响每条 stream 和整条 QUIC 连接的接收容量，单位按 `1024 × 1024` 字节计。默认 `2 / 6 / 3 / 15` 偏向节省内存；确有高延迟、大吞吐需求时，可以在该 TUIC 节点 `[USER]` 区单独尝试：

```ini
# ---- [USER] 用户自定义（修改这里，重启保留）----
tuic_initial_stream_window=4
tuic_max_stream_window=16
tuic_initial_conn_window=8
tuic_max_conn_window=64
```

这是调优起点，不是所有机器的推荐默认值。最大窗口应不小于对应初始窗口；调大后需要观察内存与吞吐。以 1 Gbps、100 ms RTT 为例，满速所需的在途数据约 12.5 MB，较小 stream 窗口可能限制速度，但增加窗口不能解决丢包、限速或 CPU 瓶颈。

时间参数属于主配置或面板字段，不能因为窗口支持 `[USER]` 就把 auth_timeout/heartbeat 一起放进节点区。更完整解释见 [TUIC 窗口与内存](heki/heki-config.md#tuic-quic-内存优化)。

## 如何确认配置生效

重启后检查 `heki log` 或容器日志中节点启动是否成功，再看对应节点文件的 `[AUTO]` 信息和参数日志。用真实客户端验证 TCP、需要的 UDP 功能和长连接；仅看到面板在线不代表所有转发组合都正常。

遇到问题按顺序核对：面板最终下发值 → 主配置/环境变量 → 节点覆盖 → 客户端订阅。证书、传输和端口修改后一般需要重启 Heki；规则文件的自动重载另见 [路由](other/routes-config.md)、[DNS](other/dns-config.md) 文档。
