# 节点管理

## 功能说明

heki 支持在单个实例中运行多个节点，并提供完整的节点管理命令。源码里会在同一个 heki 进程内，为每个 `node_id` 启动独立的节点实例。

每个节点的协议类型会在启动时按面板配置自动识别；`[USER]` 区只用于覆盖少量节点级参数（如 `listen_addr`、`proxy_protocol`、`udp_proxy_protocol`、证书模式、同步间隔等）。

## 面板下发配置覆盖

当前 `xboard` / `xiaov2board` / `ppanel` 的部分字段会在节点启动时接入 heki 运行配置。
这类配置以“节点启动时从面板获取到的值”为准；如果你修改了监听地址、TLS/证书、传输层这类参数，建议重启 heki 让它重新取面板配置。

### 已接入并会生效的字段

| 面板字段 | heki 行为 |
|--------------|---------------------------------------------|
| `listen_ip` | 面板显式下发具体 IP 时，作为该节点监听地址输入，并优先于节点文件中的 `listen_addr`；`0.0.0.0 / ::` 这类通配地址会视为默认值而忽略 |
| `base_config.push_interval` / `pull_interval` | 覆盖同步与流量上报间隔 |
| `base_config.node_report_min_traffic` / `device_online_min_traffic` | 覆盖最小上报流量阈值 |
| PPanel `traffic_report_threshold` | 按面板原始字节值覆盖最小流量上报阈值，不经过 KB 换算 |
| `trusted_x_forwarded_for` | XBoard / XiaoV2Board 会规范化并去重可信 HTTP 头名称，用于 WS、HTTP Upgrade、H2、gRPC、xhttp 与 SS 插件传输恢复客户端真实 IP |
| `cert_config` | 在本地未显式填写时补全 `cert_mode`、`cert_domain`、`cert_file`、`key_file`、`dns_provider`、DNS 环境变量；若面板下发 `cert_mode=content`，则会把 PEM 证书内容安装到本地托管目录，并复用现有 TLS 热加载路径 |
| `tls_settings.reject_unknown_sni` | 在 TLS 握手阶段强制校验客户端 SNI；优先使用面板下发的 `server_name`，若未显式给出则会尝试从当前协议的有效 host/SNI 推导 |
| `network=xhttp/splithttp` 及对应 `path` / `host` / `xhttp_mode` / `xhttp_extra` | `vmess` / `vless` / `trojan` / `anytls` 节点会统一按内置 `splithttp` listener 启动；面板写 `xhttp` 时会自动规范化为 `splithttp`，并继续复用 path/host 及可选的 mode/extra |
| `padding_scheme` | AnyTLS 节点会自动接入 padding scheme；若本地已显式写 `anytls_padding_scheme`，以本地为准 |
| `zero_rtt_handshake` | TUIC 节点会按面板值启用或关闭 0-RTT |
| `auth_timeout` / `heartbeat` | TUIC 节点会自动接入认证超时与心跳间隔；支持秒数和常见 duration 字符串 |
| `encryption_settings` | `xiaov2board` `v2node` 下发 `mlkem768x25519plus` 时，会自动转换为 VLESS 服务端 `decryption` |

证书补充说明：

- 面板证书内容支持从 `cert_config` 或 `custom_config` 读取，兼容 `public_key/private_key`、`cert_content/key_content`、`certificate/private_key`、`cert/key` 等常见别名，也兼容嵌套在 `content` / `cert_push` / `push_content` / `payload` 里的同名字段。
- `cert_mode=content` 表示“面板直接下发 PEM 证书内容”，不是本地自动申请模式；heki 会把证书内容落到本地托管目录，再按正常 TLS 路径加载。
- 证书优先级固定为 `本地手动证书 > 面板下发证书内容 > 自动申请证书`。如果你已经在 `heki.conf`、`node_xxx.conf`，或当前协议自己的证书项里显式填写了 `cert_file/key_file`，heki 不会再用面板 cert push 覆盖它们。
- 对 XBoard V2，如果 `config` 响应缺少 `protocol`，heki 不再盲目信任探测阶段的 `node_type`；会先按 payload 特征推断，仍无法安全判断时直接报错，避免把其它协议误判成 `ss`。

### 当前运行时限制与兼容说明

- 面板 `routes` / `custom_outbounds` / `custom_routes` JSON 现在会转换为 heki 本地内存路由；匹配时优先按面板路由执行，未命中再继续匹配本地 `routes_file` / `routes_url`（未显式配置 `routes_file` 时默认回退到同目录 `routes.toml`）。
- 若面板路由里使用了 heki 当前无法承载的字段或出站类型，启动时会明确报出具体规则位置和不支持字段。
- `xhttp` / `splithttp` 入站运行时现已支持 `vmess` / `vless` / `trojan` / `anytls`。面板下发 `xhttp` 时，heki 会在运行时规范化为 `splithttp`，不会静默回退到 `tcp`。
- `VMess / VLESS / Trojan / AnyTLS` 的 `xhttp` 都可以通过 XBoard 的 `network/networkSettings` 下发；如果某个面板分支没有返回这些字段，AnyTLS 可改用本地直配 `anytls_transport=xhttp`。
- 对 XBoard 常见的 `xhttp` 模版，`xhttp_extra` 里的范围值和开关值支持常见字符串写法，例如 `"16-32"`、`"8"`、`"true"`；服务端不会使用的附加字段，以及默认模版里不完整的 `downloadSettings` 占位对象，都会自动忽略，不会因此导致节点启动失败。
- `splithttp` 当前不能与 `proxy_protocol` 或 `mptcp` 同开；如果前面有 nginx / caddy 做 TLS 卸载，才考虑 `force_close_ssl=true`。
- `xiaov2board` `v2node` 的 Shadowsocks 只有 `network=tcp` 和兼容映射的 `network=http` 会接收；其余 `ws` / `grpc` / `httpupgrade` / `xhttp` 等都会直接报错。

### 仅用于订阅/客户端的常见字段

- `disable_sni` 主要用于客户端订阅，不是 heki 服务端入站开关。
- XBoard 里的 `utls`、`multiplex`、`brutal` 当前主要用于客户端配置生成，不作为 heki 服务端入站配置入口。

## 管理命令

```bash
heki node list          # 查看当前所有节点
heki node add <ID>      # 添加节点（协议将在启动时按面板自动识别）
heki node del <ID>      # 删除节点
```

也可以通过交互式菜单管理：运行 `heki` 后选择 `8. 节点管理`。

## 添加节点

```bash
heki node add 100
```

添加后协议会在下次启动时按面板配置自动识别，无需在节点配置文件里单独填写 `server_type`。

添加后需要重启 heki 使配置生效。

> 如果该节点还没真正启动过，`heki node list` 会先显示为 `待启动`；重启后才会生成完整的 `[AUTO]` 运行信息。

## 删除节点

```bash
heki node del 100
```

删除后需要重启 heki 使配置生效。

> `heki node del <ID>` 会把该节点从 `node_id=` 列表中移除，并删除对应的 `/etc/heki/nodes/node_{id}.conf`。在你重启前，旧进程仍可能显示为 `[已删除-待重启]`。

## 查看节点

```bash
heki node list
```

输出示例：
```
当前节点配置: node_id=250,251,252

节点详情:
  Node 250: ss | port=25026 | aes-256-gcm [运行中]
  Node 251: ssr | port=25027 | auth_chain_a,obfs=plain [运行中]
  Node 252: trojan | port=443 | tcp+tls [运行中]
```

## 混合协议

heki 支持在同一实例中运行不同协议类型的节点。例如：

- 节点 250 跑 Shadowsocks
- 节点 251 跑 ShadowsocksR
- 节点 252 跑 Trojan

### 配置方式

方式一：通过 `heki node add` 命令添加节点（推荐）

方式二：手动编辑节点配置文件 `/etc/heki/nodes/node_{id}.conf`，在 `[USER]` 区添加其他节点级覆盖参数，例如：
```
listen_addr=127.0.0.2
```

节点协议以面板下发为准；`[USER]` 区中的覆盖项仅影响监听地址、证书和同步参数等少量本地行为。

## 节点状态说明

`heki node list` 中的状态标记：

| 标记           | 说明                                |
|--------------|-------------------------------------|
| `[运行中]`     | 节点正在运行                             |
| `[未运行]`     | 节点已有运行配置，但当前 heki 服务未启动或未处于运行状态 |
| `[已删除-待重启]` | 节点已从配置中删除，但服务未重启，仍在运行              |
| `[已删除-残留配置]` | 节点已从配置中删除，服务也未运行；残留的节点配置会在下次成功启动时自动清理 |
| `待启动`       | 节点已添加到配置，但服务未重启，尚未启动               |
