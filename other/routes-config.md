# 多路由多出口负载均衡

## 功能说明
routes 用于将入口节点收到的用户流量，按规则转发到不同的代理出口。

典型场景：
- 入口节点在国内/中转机房，出口节点在海外，通过 routes 将流量转发到海外节点
- 给自己的入口服务器挂一个代理出口
- 按域名、地区、节点 ID 分流

```
用户客户端 -> 入口节点(配 routes) -> 出口节点(正常运行) -> 目标网站
```

!> `routes.toml` 只需要放在入口节点上，出口节点不需要额外配置；它作用于 heki 节点接收到的用户流量，不会让整台服务器的 `curl`、`apt`、`docker` 自动全局走代理。

!> 单进程多节点模式下，多个 `node_id` 共用同一份 `routes.toml`，但每个节点都会按自己的当前 `node_id` 独立匹配规则；因此可以用 `node_id:1`、`node_id:2` 这类规则实现“一台服务器多个入口节点，对应多个不同出口”。

## 自定义配置文件位置
本地路由文件支持以下优先级：

- CLI `-r /path/to/routes.toml`
- `heki.conf` 中配置 `routes_file=/path/to/routes.toml`
- 若都未配置，默认回退到 `heki.conf` 同目录下的 `routes.toml`

多开实例下，如果你希望不同实例使用不同的本地路由文件，推荐优先使用 CLI `-r`；也可以在各自的 `heki.conf` 中写不同的 `routes_file`。

## 配置文件自动重载
纯本地模式下（未配置 `routes_url`），修改本地 `routes.toml` 时，heki 会每 10 秒自动检测文件变更并重载规则，无需重启；新规则加载完成后会立即参与转发匹配

## 路由优先级

一条连接按下面的顺序匹配，命中即停止：

1. 面板下发的运行时路由（`routes` / `custom_routes`）
2. `routes_url` 远程路由，或本地 `routes_file`

第 2 层只有一份规则在生效：配置了 `routes_url` 就用远程内容，本地 `routes_file` 只在远程不可用时作为回退源，两者不会叠加匹配。

| 来源 | 生效方式 | 是否需要重启 |
|------|----------|--------------|
| 面板 `routes` / `custom_outbounds` / `custom_routes` / DNS 规则 | 每个用户同步周期（`check_interval`，面板下发 `pull_interval` 时以面板为准）重新拉取，有变化时原地替换 | 否 |
| `routes_url` | 每 1 分钟刷新 | 否 |
| 本地 `routes_file` | 每 10 秒检测文件变更 | 否 |

> 面板路由热加载只影响之后新建的连接，已建立的连接继续使用原出口直到结束。
>
> 热加载的范围是路由、出口和 DNS 规则。节点的协议、端口、传输层、加密方式、证书等监听参数在面板上修改后仍需重启 heki。
>
> 面板新配置会先整体校验（例如引用了不存在的出口 tag、出口缺少必填字段），校验失败时保留当前生效的路由，并在日志里打印一次 `[WARN] ... the new config was rejected` 及原因；面板请求失败时同样保留当前路由。
>
> 例外：如果节点启动时没有任何首包检查规则（面板 `action=protocol`、本地 `protocol:xxx`、`forbidden_bt`、`detect_packet` 都没有），运行中在面板上新增的 `action=protocol` 规则需要重启才会执行，日志会给出提示。其余规则和出口不受此限制。

## 远程加载配置文件
| 参数名           | 默认值 | 说明 |
|---------------|--------|------|
| `routes_file` | 同配置目录 `routes.toml` | 本地路由配置文件路径；CLI `-r` 优先，其次使用这里的配置 |
| `routes_url`  | 无 | 从 URL 中加载路由配置，并自动更新，更新间隔为 1 分钟；留空则从本地文件加载 |

> 本地文件路径优先级是：CLI `-r` > `heki.conf` 中的 `routes_file` > `heki.conf` 同目录默认 `routes.toml`。
>
> 配置了 `routes_url` 后，路由会优先使用远程内容，并按 1 分钟间隔自动刷新；这时本地 `routes_file` 主要作为回退源，不再参与 10 秒文件热重载。
>
> 当前实现中，只要远程请求失败、返回 HTTP 非 2xx、响应体读取失败、或远程 TOML 解析失败，都会回退读取本地 `routes_file`（未配置时默认回退到 `routes.toml`）。如果本地文件也不可用，则会继续保留上一份成功加载的远程配置（若有）。

## 支持的代理出口

| 类型       | 详细说明                                         |
|----------|----------------------------------------------|
| block    | 拒绝命中的连接；也兼容写成 `reject`                    |
| direct   | 直连                                           |
| vmess    | tcp、ws、http、h2、grpc（均可选 TLS） |
| vless    | tcp、ws、http、h2、grpc（均可选 TLS）；其中 tcp 额外支持 Reality，支持基础 VLESS 与 Vision(TCP+TLS/Reality) |
| trojan   | tls                                          |
| ss       | 大多数加密均支持，不支持插件                               |
| ssr      | 大多数加密、协议、混淆均支持                               |
| anytls   | AnyTLS，TCP over TLS                         |
| wireguard | WireGuard，用户态实现，不创建系统网卡，TCP / UDP 均可；[使用说明](other/wireguard-outbound.md) |
| socks    | 带用户名和密码或不带均可                                 |
| http     | 带用户名和密码或不带均可                                 |
| redirect | 将用户访问的地址+端口重定向到指定的地址+端口                      |

> 本地路由文件默认路径为 `heki.conf` 同目录下的 `routes.toml`；若配置了 CLI `-r` 或 `routes_file`，则按指定路径读取。若本地文件与 `routes_url` 都未启用，则默认直连。

!> `routes.toml` 的出口类型也会兼容常见别名：`freedom -> direct`、`socks5 -> socks`、`shadowsocks -> ss`、`reject -> block`、`wg -> wireguard`。

!> `routes` 不是 V2Ray/Xray 的 `outbounds` / `routing` 格式，不支持 `[[outbounds]]`、`protocol="freedom"`、`protocol="shadowsocks"`、`[routing]`、`[[routing.rules]]`、`network="tcp,udp"` 这类写法。

!> 本地 `routes_file` / `routes_url` 支持 `protocol:xxx` 首包协议规则，但它只用于拦截，`不参与普通路由分流`。这类路由的出口必须是 `block/reject`，且不能和 `domain/ip/port` 等普通规则混写。

> TCP 和 UDP 共用同一路由匹配逻辑，不需要单独写 `network="tcp,udp"`。`http` 出口不支持 UDP；`direct`、`redirect`、`socks`、`ss`、`vmess`、`trojan`、`ssr`、`anytls`、`vless`、`wireguard` 均可用于 UDP。VLESS Vision 在 `tcp + tls` 或 `tcp + reality` 上传输 XUDP，因此底层传输为 TCP 也可以转发 UDP 数据报。

> “无匹配则关闭连接”描述的是本地 `routes_file` / `routes_url`。对于 XBoard / XiaoV2Board 面板下发的运行时路由，heki 会先匹配面板路由；若未命中，再继续匹配本地路由。若本地路由也未启用，且面板没有提供默认出站规则，heki 才会对未命中流量使用最终 `direct` 兜底。

> 如果规则主要写的是 `geosite:`、`domain:`、`domain-suffix:`、`domain-keyword:`，而客户端经常只上传 `IP:端口`，建议同时开启 `domain_sniff`。在 `sniff_redirect=false` 时，heki 也会把嗅探出的域名交给路由层匹配，不需要为了命中域名规则强制改写出站目标 IP。

## 面板下发格式支持说明

当前 heki 支持 XBoard / XiaoV2Board 面板下发的 `routes / custom_outbounds / custom_routes` 运行时路由。

!> 这里说的是面板运行时 JSON，不是本地 `routes.toml`。本地文件仍按 heki 自己的格式书写。

### `routes[]`

- `action`：`block`、`direct`、`proxy`、`route`、`dns`、`protocol`
- 旧动作兼容：`block_ip`、`block_port`、`route_ip`、`default_out`
- `protocol` 为首包协议拦截，支持 `http`、`http1`、`http2`、`tls`、`quic`、`bittorrent`
- `match`：`geosite:`、`domain:`、`full:`、`regexp:`、`geoip:`、`ip:`、`port:`、`node_id:`、`network:`、`*`
- 本地 `routes.toml` 额外兼容常见别名：`domain-suffix:` / `domain_suffix:` 会按 `domain:` 处理，`domain-keyword:` / `domain_keyword:` 会按“域名子串匹配”处理
- 裸域名自动按 `domain:` 处理，带 `*` 的域名自动转 `regexp:`，纯 IP / CIDR / 端口会自动规范化
- `dns` 规则进入 DNS 规则管理器，不走普通流量路由
- `action=protocol` 也不走普通流量路由，而是进入首包协议拦截规则；命中后直接拒绝连接，不使用 `custom_outbounds`
- `match` 只支持字符串数组，不支持 `# 注释行`

### `custom_outbounds[]`

- 类型：`direct`、`redirect`、`socks`、`http`、`ss`、`ssr`、`trojan`、`vmess`、`vless`、`anytls`、`wireguard`、`block`、`dns`
- 常见别名会自动归一化，如 `freedom -> direct`、`socks5 -> socks`、`reject -> block`
- `vmess` / `vless` 支持 `tcp`、`ws`、`http`、`h2`、`grpc`
- `trojan` / `anytls` 仅支持 `tcp`；`vless + reality` 也仅支持 `tcp`
- 出口对象顶层可写 `listen_ipv4` / `listen_ipv6` / `listen_strategy`，含义见下文「出口地址绑定」一节
- `wireguard` 接受 heki 平铺字段，也接受 sing-box（`local_address` + `peer_public_key`，或 `address` + `peers[]`）和 Xray（`settings.secretKey` + `settings.peers[].endpoint`）的写法，示例见 [WireGuard 出口](other/wireguard-outbound.md)

### `custom_routes[]`

- `type`：`field`、`default`、`logical`；`logical.mode`：`or`、`and`
- 匹配字段：`domain`、`domain_suffix`、`domain_keyword`、`domain_regex`、`geosite`、`geoip`、`ip_cidr` / `ip`、`port` / `port_range`、`network`、`node_id`
- 出口引用：`outboundTag`、`outbound_tag`、`outbound`，也支持 `action` / `action_value`
- 没写匹配字段时等价 `*`
- `invert=true` 和直接指向 DNS outbound 当前不支持

### 默认兜底行为

- 面板显式给出 `default_out`、`rules=["*"]` 或默认自定义路由时，按面板配置执行
- 未显式下发默认路由时：
  面板未命中后若本地 `routes_file` / `routes_url` 已启用（未显式配置 `routes_file` 时默认回退到 `routes.toml`），则继续走本地路由
  若本地路由未启用，heki 才会自动补一个最终 `direct`
- 只影响运行时，不改写本地 `routes.toml`

### 常见排障

- 日志里看到 `Listening on :30356` 才是最终生效的监听端口；前面自动识别阶段打印的默认端口不一定是最终监听值
- 面板下发运行时路由后，本地 `routes.toml` 不会被覆盖；未命中时仍可能继续走本地规则
- `domain-suffix:` / `domain-keyword:` 是 heki 本地 `routes.toml` 的兼容别名，不需要改写成 Xray/Sing-box 格式
- 如果客户端只上传目标 IP，又没有开启 `domain_sniff`，那 `geosite:` / `domain:` 一类规则天然更难命中

## 字段写法说明
`routes` 出口配置统一使用平铺字段，例如 `ws_path`、`h2_host`、`grpc_service_name`、`reality_public_key`

!> 不提供额外的嵌套子表兼容；若文档没有单独写出某种字段名，就按示例里的平铺字段填写，不要写成 `[routes.Outs.xxx]`。这类额外子表当前会被忽略。

## 配置详解
- `至少配置一个路由`
- 按路由顺序匹配访问的`域名/IP`，当遇到匹配的路由后，则使用该路由下的代理出口（`随机使用其中一个`）；若没有匹配的路由，则`直接关闭连接`
- 同一路由下配置多个 `[[routes.Outs]]` 时，heki 会随机选择一个出口，`不是主备切换`

```
# 是否启用路由，若关闭则默认直连
enable=true

# 路由 1 匹配规则列表，与审计规则格式相同，只要满足任意一条规则即可匹配成功
[[routes]]
rules=[
"geosite:netflix",        # 匹配 geosite 规则
"domain:google.com",      # 匹配域名后缀
"geoip:cn",               # 匹配 geoip 规则
"ip:1.2.3.4/24",          # 匹配 ip 或 ip 段
"port:1000-2000",         # 匹配端口或端口段
"node_id:1,2,3",          # 匹配节点 id，以逗号分隔多个 id
]

[[routes.Outs]] # 路由 1 代理出口 1
listen=""
type="socks"
server="aaa.com"
port=12345
username="asd"
password="asd"

[[routes.Outs]] # 路由 1 代理出口 2
# 此处省略代理出口配置



# 路由 N，最后一个路由兜底，否则无法匹配剩余的域名/IP
[[routes]]
# "*" 表示匹配任何域名/IP
rules=["*"]

# 配置直连出口
[[routes.Outs]]
listen="" # 出口网卡 ip，不配置则由系统决定
type="direct"
```

### 代理出口配置

#### direct
```
listen="" # 出口网卡 ip，不配置则由系统决定
type="direct"
```

#### 出口地址绑定

`listen` 只能填一个 IP，也就只能绑定一个地址族。双栈服务器上想让 IPv4 目标从某个 IPv4 地址出、IPv6 目标从某个 IPv6 地址出，并指定两族都可用时走哪一族，使用下面三个字段：

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `listen_ipv4` | 无 | 连接 IPv4 地址时绑定的本地 IPv4；不配置则由系统决定 |
| `listen_ipv6` | 无 | 连接 IPv6 地址时绑定的本地 IPv6；不配置则由系统决定 |
| `listen_strategy` | `ipv4_first` | 两族都可用时用哪一族：`ipv4_first` / `ipv4_only` / `ipv6_first` / `ipv6_only`。只配置了 `listen_ipv6` 而没配 `listen_ipv4` 时默认 `ipv6_first` |

```
type="direct"
listen_ipv4="203.0.113.10"
listen_ipv6="2001:db8::10"
listen_strategy="ipv6_first"
```

- 三个字段都不写时行为与之前完全一致，旧配置不需要改动。写了任意一个即启用。
- 适用于 `direct`、`redirect`、`socks`、`http`、`ss`、`ssr`、`trojan`、`vmess`、`vless`、`anytls`；`wireguard` 出口不支持（隧道内的地址由 `address` 决定）。
- **`direct` / `redirect`**：决定连接目标时使用的地址族和本地地址。
  - 目标是域名：按 heki 的解析顺序（[DNS 规则](other/dns-config.md) > `default_dns` > 系统 DNS）取得全部地址，再按 `listen_strategy` 选择。此时由 `listen_strategy` 决定地址族，DNS 规则和 `dns_strategy` 里的 strategy 对这个出口不生效。
  - 目标本身是 IP：只能使用它所属的那一族；被 `ipv4_only` / `ipv6_only` 排除时连接失败，日志里会写明 `excluded by listen_strategy`。
- **代理类出口**：作用于连到代理服务器（`server`）的那条连接，即 `server` 域名解析后选哪一族、从哪个本地地址连过去。用户目标由代理服务器负责解析和连接，不受这三个字段影响。
- **`ipv4_first` / `ipv6_first` 的回退**：TCP 先连优先的一族，300ms 内没连上或连接失败时并行尝试另一族，谁先连上用谁（Happy Eyeballs）。UDP 没有连接建立过程，无法探测可达性，直接使用优先族的地址，不会回退。
- **与 `listen` 的关系**：`listen` 仍然可用。和新字段一起写时，`listen` 视为它所属地址族的写法（IPv4 地址等同 `listen_ipv4`，IPv6 地址等同 `listen_ipv6`）；与同族的新字段取值不同时会报错。
- **与 `auto_out_ip` 的关系**（仅 `direct`）：显式配置的地址优先；没有显式配置的那一族在开启 `auto_out_ip` 时使用入口连接的本地 IP。
- 面板 `custom_outbounds` 里写在出口对象顶层，字段名相同（也接受 `listenIPv4` / `listenIPv6` / `listenStrategy`）。
- 配置有误（例如 `listen_ipv4` 填了 IPv6 地址、`listen_strategy` 取值不对）时，加载路由会报错并指出是哪条路由的哪个出口。

只走 IPv6 出口、目标没有 IPv6 就拒绝：

```
type="direct"
listen_ipv6="2001:db8::10"
listen_strategy="ipv6_only"
```

IPv4 优先、两族各用指定的出口地址，经 SOCKS5 代理：

```
type="socks"
server="proxy.example.com"
port=1080
listen_ipv4="203.0.113.10"
listen_ipv6="2001:db8::10"
```

!> 出口里写了 heki 不认识的字段时（拼写错误，或其它软件的字段名），加载本地 / 远程路由会打印一次 `[WARN] Routes: ... has unrecognized field(s) ...; they are ignored`，该字段不会生效。

#### vmess
```
listen=""
type="vmess"
server="xxx.com"
port=12345
uuid="xxx"
alter_id=0
network="ws"    # 可选: tcp ws http h2 grpc
ws_path="/asd"
h2_path="/path" # http / h2 使用，默认 "/"
h2_host="xxx.com" # http / h2 / grpc 可选，默认 sni 或 server
grpc_service_name="GunService" # grpc 使用，默认 GunService
tls=true
sni="xxx.com"
skip_cert_verify=false
```

!> `network="http"` 是 V2Ray / V2Fly 的 HTTP/2 传输名称；`routes` 同时接受 `http` 和 `h2`，两者共用同一套 HTTP/2 实现与 `h2_path` / `h2_host` 参数。
!> `tls=true` 为可选；未开启时，`ws` 使用明文 WebSocket，`http` / `h2` / `grpc` 使用明文 HTTP/2（h2c）。
!> 也兼容旧字段别名：`http_path`、`http_host`、`service_name`。

常见写法：

```toml
# TCP
[[routes.Outs]]
listen=""
type="vmess"
server="vmess.example.com"
port=443
uuid="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
alter_id=0
network="tcp"
tls=true
sni="vmess.example.com"
skip_cert_verify=false
```

```toml
# WebSocket
[[routes.Outs]]
listen=""
type="vmess"
server="edge.example.com"
port=443
uuid="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
alter_id=0
network="ws"
ws_path="/vmess"
tls=true
sni="cdn.example.com"
skip_cert_verify=false
```

```toml
# HTTP/2（V2Ray / V2Fly 写法）
[[routes.Outs]]
listen=""
type="vmess"
server="edge.example.com"
port=443
uuid="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
alter_id=0
network="http"
h2_path="/vmess"
h2_host="cdn.example.com"
tls=true
sni="cdn.example.com"
skip_cert_verify=false
```

```toml
# HTTP/2（heki 也兼容 h2）
[[routes.Outs]]
listen=""
type="vmess"
server="edge.example.com"
port=443
uuid="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
alter_id=0
network="h2"
h2_path="/vmess"
h2_host="cdn.example.com"
tls=true
sni="cdn.example.com"
skip_cert_verify=false
```

```toml
# gRPC
[[routes.Outs]]
listen=""
type="vmess"
server="edge.example.com"
port=443
uuid="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
alter_id=0
network="grpc"
grpc_service_name="GunService"
h2_host="grpc.example.com"
tls=true
sni="grpc.example.com"
skip_cert_verify=false
```

#### vless
```
listen=""
type="vless"
server="xxx.com"
port=443
uuid="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
flow=""          # 可选: "", "xtls-rprx-vision"
network="ws"     # 可选: tcp ws http h2 grpc
ws_path="/vless"
h2_path="/path"  # http / h2 使用，默认 "/"
h2_host="xxx.com" # http / h2 / grpc 可选，默认 sni 或 server
grpc_service_name="GunService" # grpc 使用，默认 GunService
tls=true
sni="xxx.com"
skip_cert_verify=false
```

!> `network="http"` 与 `network="h2"` 共用同一套 HTTP/2 传输实现。
!> `tls=true` 为可选；未开启时，`ws` 使用明文 WebSocket，`http` / `h2` / `grpc` 使用明文 HTTP/2（h2c）。
!> `flow="xtls-rprx-vision"` 仅支持 `network="tcp"` 且必须 `tls=true` 或 `security="reality"`；UDP 自动使用 XUDP 封装。
!> 也兼容旧字段别名：`http_path`、`http_host`、`service_name`。

```toml
# Reality（TCP only）
listen=""
type="vless"
server="5.231.223.111"
port=443
uuid="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
flow="xtls-rprx-vision"
network="tcp"
security="reality"
sni="images.apple.com"
reality_fingerprint="firefox" # 可选，默认 chrome
reality_public_key="fMmpLjwaUJ2dDcw_bnQ-LtVr_xAGwPpTFKy27XJvEUM"
reality_short_id="6e5e01d60078"
reality_spider_x="/"
skip_cert_verify=false
```

!> `security="reality"` 仅支持 `network="tcp"`。
!> `reality_public_key` 需填写服务端给出的 base64url 公钥；`reality_short_id` 需填写 `0-16` 位十六进制字符串。
!> Reality 模式不会走传统证书校验，`skip_cert_verify` 对该模式无实际作用；保留该字段只是为了让示例格式与普通 TLS 出站保持一致。
!> 若已填写 `reality_*` 字段，即使未显式写 `security="reality"`，当前实现也会按 Reality 处理；但仍建议显式写出 `security`，避免歧义。

#### trojan
```
listen=""
type="trojan"
server="xxx.com"
port=12345
password="xxx"
sni="xxx.com"
skip_cert_verify=false
```

#### anytls
```
listen=""
type="anytls"
server="xxx.com"
port=443
password="xxx"
sni="xxx.com"
skip_cert_verify=false
```

!> AnyTLS 支持 UDP 出站，底层使用 udp-over-tcp（UoT）封装。

#### wireguard
```
type="wireguard"
# 对端（WireGuard 服务器）地址和端口，对应 wg 配置里的 Endpoint
server="wg.example.com"
port=51820
# 本端私钥，对应 [Interface] PrivateKey
private_key="eBBDDuGXxQXPuoLynRrlE09qjsf/JNLIu0akFktNTX8="
# 对端公钥，对应 [Peer] PublicKey
public_key="rulahMx/Wx+NaGt/GGzIu4YUHhFa+HlBFpVzb7/vCjs="
# 本端隧道地址，对应 [Interface] Address；双栈写成 "10.66.0.2/32,fd00::2/128" 或数组
address="10.66.0.2/32"

# 以下均为可选
# 预共享密钥，对应 [Peer] PresharedKey
pre_shared_key=""
# 默认 1420
mtu=1420
# 保活间隔（秒），对应 PersistentKeepalive；默认不发送
keepalive=25
# 3 个保留字节，Cloudflare WARP 等服务需要；写成 "1,2,3" 或 3 字节的 base64
reserved=""
# 隧道内使用的 DNS，对应 [Interface] DNS；留空则由 heki 解析后再经隧道连接
dns="1.1.1.1"
```

!> 示例密钥为演示值，请替换。用户态实现，不创建系统网卡、不需要 root，TCP / UDP 均可，可同时配置多个 WireGuard 出口。

完整的使用说明（从 wg 配置文件转换、自建服务器、分流 / 负载均衡 / 远程批量 / 面板下发示例、排障）见 [WireGuard 出口](other/wireguard-outbound.md)。

#### ss
支持传统 AEAD 和 SS2022，不支持插件。

传统 AEAD 示例：

```toml
listen=""
type="ss"
server="aaa.com"
port=12345
password="asdasd"
cipher="aes-128-gcm"
```

SS2022 示例：

```toml
listen=""
type="ss"
server="aaa.com"
port=12345 # 替换为实际端口
password="iPSK的base64:uPSK的base64"
cipher="2022-blake3-aes-128-gcm"
```

!> SS2022 的 `password` 格式为 `iPSK:uPSK`。如果出口节点是单用户模式，无需 `iPSK` 时，可直接填写用户的 PSK。

#### ssr
```
listen=""
type="ssr"
server="aaa.com"
port=12345
password="asdasd"
cipher="aes-128-gcm"
obfs="plain"
obfs_param=""
protocol="origin"
protocol_param=""
```

#### socks
```
listen=""
type="socks"
server="aaa.com"
port=12345
username=""
password=""
```

#### http
```
listen=""
type="http"
server="aaa.com"
port=12345
username=""
password=""
```

#### redirect 重定向

将用户访问的地址+端口重定向到指定的地址+端口

```
listen=""
type="redirect"
server="aaa.com"  # 重定向地址
port=12345        # 重定向端口，若设置为 0，则使用用户访问的端口
```

## 使用示例

一个节点就可以挂多个出口，不是必须先配置多个 `node_id`。只有当你想让不同入口节点固定对应不同出口时，才需要按 `node_id` 分流。

### 示例 1：一个节点，多个出口按规则分流

同一个入口节点收到的流量，按域名或地区分到不同出口：

!> 这里的 `ss`、`trojan` 是不同的出站协议类型，不是一个节点同时监听两个入口协议。入口节点本身仍然只有一个；只是命中不同规则后，流量会走不同协议的出口代理。

```toml
enable=true

[[routes]]
rules=["geosite:netflix"]

[[routes.Outs]]
type="ss"
server="us-exit.example.com"
port=12345 # 替换为实际端口
password="your-password"
cipher="aes-256-gcm"

[[routes]]
rules=["geosite:telegram", "domain:google.com"]

[[routes.Outs]]
type="trojan"
server="sg-exit.example.com"
port=12345 # 替换为实际端口
password="your-password"
sni="sg-exit.example.com"

[[routes]]
rules=["*"]

[[routes.Outs]]
type="direct"
```

说明：
- 这是“一个入口，多出口”的典型写法
- 不需要配置多个节点
- 如果想让其余流量也继续走代理，把最后一条 `direct` 改成别的出口即可

### 示例 2：一个节点，多个出口随机负载均衡

如果同一批流量希望在多个出口之间随机分配，可以把多个出口写在同一个 `[[routes]]` 下：

```toml
enable=true

[[routes]]
rules=["*"]

[[routes.Outs]]
type="ss"
server="hk1.example.com"
port=12345 # 替换为实际端口
password="pass-1"
cipher="aes-256-gcm"

[[routes.Outs]]
type="ss"
server="hk2.example.com"
port=12345 # 替换为实际端口
password="pass-2"
cipher="aes-256-gcm"

[[routes.Outs]]
type="ss"
server="hk3.example.com"
port=12345 # 替换为实际端口
password="pass-3"
cipher="aes-256-gcm"
```

说明：
- 同一路由下多个 `[[routes.Outs]]` 会随机选择一个出口
- 这不是主备切换，也不是按权重调度

### 示例 3：一台服务器对接 3 个节点，分别走 3 个出口

如果你的 heki 是单进程多节点，例如：

```ini
node_id=1,2,3
```

那么可以在同一份 `routes.toml` 里按 `node_id` 分流：

```toml
enable=true

[[routes]]
rules=["node_id:1"]

[[routes.Outs]]
type="ss"
server="out-1.example.com"
port=12345 # 替换为实际端口
password="pass-1"
cipher="aes-256-gcm"

[[routes]]
rules=["node_id:2"]

[[routes.Outs]]
type="ss"
server="out-2.example.com"
port=12345 # 替换为实际端口
password="pass-2"
cipher="aes-256-gcm"

[[routes]]
rules=["node_id:3"]

[[routes.Outs]]
type="trojan"
server="out-3.example.com"
port=12345 # 替换为实际端口
password="pass-3"
sni="out-3.example.com"
```

说明：
- 适合同一台入口服务器承载多个面板节点
- 每个节点会按自己的 `node_id` 命中对应出口
- 如果这些节点来自不同面板，建议使用多实例或多容器，而不是单进程多节点
- 如果入口和出口在同一台机器上，出口端口不能指回入口自己的同一个监听端口，否则会形成死循环
