# 节点管理

## 功能说明

heki 支持在单个实例中运行多个节点，并提供节点增删和状态查看命令。源码里会在同一个 heki 进程内，为每个 `node_id` 启动独立的节点实例。

每个节点的协议类型会在启动时按面板配置自动识别；`[USER]` 区只用于覆盖少量节点级参数（如 `listen_addr`、`proxy_protocol`、`udp_proxy_protocol`、证书模式、同步间隔等）。

## 最短操作流程

同一面板的多个节点，先在 `heki.conf` 设置 `node_id=250,251,252`，或使用下面的命令。需要不同面板或独立重启时，使用[多实例部署](other/heki-multi-instance.md)。

```bash
heki node list          # 查看本次进程的节点启动结果
heki node add 100       # 添加到启用列表；已有节点文件会保留并复用
heki node del 100       # 从启用列表移除，保留节点文件
heki restart           # 应用修改，会中断本实例所有节点的连接
```

添加、移除和编辑节点文件都不会立即改变正在运行的节点；使用添加/移除命令时，管理脚本会询问是否重启。命名实例应使用 `heki instance node hk-a list/add/del ...` 和 `heki instance restart hk-a`。Docker 应修改容器实际使用的配置并重启对应容器；通过环境变量传入的 `node_id` 要修改环境变量并重新创建容器，仅改挂载文件不会覆盖它。

可以通过交互式菜单管理：运行 `heki` 后选择 `8. 节点管理`。

### 节点配置保留

`heki node del <ID>` 仅从主配置的 `node_id=` 中移除该节点，保留 `/etc/heki/nodes/node_<ID>.conf`；启动时也不会自动删除未启用节点的配置。重新添加同一 ID 时会复用 `[USER]` 设置。若该 ID 在面板中被重新分配给其他用途，请先检查保留的证书、监听地址和认证配置。

### 正确理解状态

```text
主配置文件启用节点: 250,251,252
  Node 250: [已启动] ss | port=25026
  Node 251: [启动失败，请查看日志]
  Node 252: [未加载，需重启]
```

| 状态 | 含义 |
|---|---|
| `[已启动]` | 当前服务进程中，该节点启动成功；不代表客户端认证或完整转发已经验证 |
| `[启动失败，请查看日志]` | 本次启动失败；用 `heki log` 查看该节点具体错误 |
| `[等待启动]` / `[启动中]` | 当前进程尚未完成该节点启动 |
| `[未加载，需重启]` | 主配置已启用，但当前进程启动记录中没有该节点 |
| `[停止中]` / `[已停止]` | 当前进程记录的关闭阶段 |
| `[服务未运行]` | 所属服务没有运行 |
| `[未启用，配置保留]` | 节点未在主配置启用，配置文件仍保留 |
| `[状态未核验，请查看日志]` | 没有匹配当前服务进程的记录，例如旧内核、记录不可读或进程刚切换；不能据此断定节点正常或故障 |

`heki node list`、`heki status` 和启动后的摘要共用这一判断。只有与当前服务 PID、启动时间及本次系统启动匹配的记录才用于展示启动结果，不再用历史配置补显协议和端口。主配置文件和当前进程可能不同，环境变量也可能覆盖主配置；以实际启动日志核对。

服务管理脚本适用于 systemd/OpenRC 管理的进程。Docker 内核通常不由它们托管，应通过 `docker logs <容器名>` 查看各节点的 `started successfully` / `Failed to start node`，不能用容器内的服务状态代替内核状态。

### 按节点修改参数

主配置和节点区的空值、注释、环境变量与键名区别，见[容易混淆的写法](heki/heki-config.md#主配置和节点区容易混淆的写法)。删除节点参数表示恢复继承，不代表关闭功能；模板注释值也不代表当前生效值。

在 `nodes/node_<ID>.conf` 的 `[USER]` 标记下填写支持项。旧的完整中文标记继续有效，也支持单独一行 `[USER]` 或 `# [USER]`。现在该文件只保存用户覆盖项，不再显示历史协议和端口。旧 `[AUTO]` + `[USER]` 文件无需手工迁移，首次成功启动后自动分离，保留用户区。启动快照另存于主配置同目录的 `.runtime/nodes/node_<ID>.conf`，带生成时间；它不代表当前运行状态，也不是修改参数的入口。

主配置 `server_type` 仍用于面板协议选择/探测，PPanel 多协议节点会用它选择协议；节点 `[USER]` 不支持改协议。`heki config` 的摘要隐藏这一全局值，各节点协议以本次启动结果为准；完整主配置用 `heki config --raw` 查看。

想确认某个参数最终用的是哪一层的值，执行 `heki config --effective`：它按节点列出本次启动解析出的最终值，并标注来源是内置默认值、`heki.conf`、环境变量、节点 `[USER]` 还是面板。

例如，为两个 VMess 节点分别设置本地认证默认值：

```ini
# nodes/node_44.conf 的用户区
[USER]
vmess_alter_id=1
force_vmess_md5=true
force_vmess_aead=false
```

```ini
# nodes/node_45.conf 的用户区
[USER]
vmess_alter_id=0
force_vmess_md5=false
force_vmess_aead=true
```

`vmess_alter_id` 仅在面板节点 API 缺少该字段时兜底，面板显式下发 `0` 也优先；客户端订阅须与最终值一致。两个认证开关互斥：节点 `[USER]` 中显式设为 `true` 的一项会取代主配置继承的另一项；只有在同一个 `[USER]` 区把两项都设为 `true` 时，该 VMess 节点才会启动失败并提示修正。

不支持的键、重复键和格式错误会提示文件与行号；未知键不会生效，重复键以最后一次出现为准。普通整数覆盖项的最后一次值为空或无效时，会继承主配置或环境变量中的值，不会恢复前面重复项的值。例如主配置 `check_interval=60`，节点文件依次写入 `check_interval=30`、`check_interval=bad`，本地解析结果为 `60`；面板若另行下发同步间隔，仍按面板优先规则处理。VMess 专用覆盖项在协议确定后校验，非法值会使该 VMess 节点启动失败。

缺少 `[USER]` 标记时会告警，并保留整个旧文件，避免覆盖无法识别的自定义内容。完整参数范围见[节点参数表](heki/heki-config.md#_221-可在-user-区修改的参数)。

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
| XiaoV2Board `tls_settings.cert_mode=remote`、`tls_cert`、`tls_key`、`server_name` | 安装面板提供的证书与私钥；若提供证书 SHA-256 pin，会先校验再使用，本地显式手动证书优先 |
| PPanel 自签证书指纹 | Heki 状态上报发送 `X-Node-Certificate-SHA256`，面板保存到 `cert_pin_sha256`；客户端订阅仍需模板输出 pin |
| Mieru `transport` / `network`、`traffic_pattern`、`user_hint_is_mandatory` | 映射到实际传输、流量模式和 user hint 策略；明确下发时优先于本地对应值 |

证书补充说明：

- 面板证书内容支持从 `cert_config` 或 `custom_config` 读取，兼容 `public_key/private_key`、`cert_content/key_content`、`certificate/private_key`、`cert/key` 等常见别名，也兼容嵌套在 `content` / `cert_push` / `push_content` / `payload` 里的同名字段。
- `cert_mode=content` 表示“面板直接下发 PEM 证书内容”，不是本地自动申请模式；heki 会把证书内容落到本地托管目录，再按正常 TLS 路径加载。
- 证书优先级固定为 `本地手动证书 > 面板下发证书内容 > 自动申请证书`。如果你已经在 `heki.conf`、`node_xxx.conf`，或当前协议自己的证书项里显式填写了 `cert_file/key_file`，heki 不会再用面板 cert push 覆盖它们。
- 对 XBoard V2，如果 `config` 响应缺少 `protocol`，heki 不再盲目信任探测阶段的 `node_type`；会先按 payload 特征推断，仍无法安全判断时直接报错，避免把其它协议误判成 `ss`。

### 当前运行时限制与兼容说明

- 面板 `routes` / `custom_outbounds` / `custom_routes` JSON 现在会转换为 heki 本地内存路由；匹配时优先按面板路由执行，未命中再继续匹配本地 `routes_file` / `routes_url`（未显式配置 `routes_file` 时默认回退到同目录 `routes.toml`）。
- 若面板路由里使用了 heki 当前无法承载的字段或出站类型，启动时会明确报出具体规则位置和不支持字段。
- 运行中在面板上修改 `routes` / `custom_outbounds` / `custom_routes` 会在下一个同步周期自动生效，无需重启；新配置无效时保留当前路由并在日志中说明原因。
- `xhttp` / `splithttp` 入站支持 `vmess` / `vless` / `trojan` / `anytls`。面板下发 `xhttp` 时，heki 会在运行时规范化为 `splithttp`，不会静默回退到 `tcp`。
- XBoard 官方默认模板的 VMess / VLESS / Trojan XHTTP 已适配；官方 AnyTLS server config 尚缺 network/networkSettings，需使用能下发这些字段的分支或按本地支持范围配置，并另行保证客户端订阅正确。
- 对 XBoard 常见的 `xhttp` 模版，`xhttp_extra` 里的范围值和开关值支持常见字符串写法，例如 `"16-32"`、`"8"`、`"true"`；服务端不会使用的附加字段，以及默认模版里不完整的 `downloadSettings` 占位对象，都会自动忽略，不会因此导致节点启动失败。
- `splithttp` 当前不能与 `proxy_protocol` 或 `mptcp` 同开；如果前面有 nginx / caddy 做 TLS 卸载，才考虑 `force_close_ssl=true`。
- `xiaov2board` `v2node` 的 Shadowsocks 只有 `network=tcp` 和兼容映射的 `network=http` 会接收；其余 `ws` / `grpc` / `httpupgrade` / `xhttp` 等都会直接报错。

### 仅用于订阅/客户端的常见字段

- `disable_sni` 主要用于客户端订阅，不是 heki 服务端入站开关。
- XBoard 里的 `utls`、`multiplex`、`brutal` 当前主要用于客户端配置生成，不作为 heki 服务端入站配置入口。
- Hy2 / TUIC 的 `allow_insecure` 不会让服务端替客户端跳过证书验证；客户端应按支持情况配置证书信任或 pin。
- Mieru `multiplexing` 是客户端复用偏好，后端保留该值但不据此限制连接数量；三项 TCP 回收超时需要在 Heki 本地配置。

### 常见的“改了但没生效”

1. 面板 JSON 字段与 Heki 本地键不同。例如面板的 `transport=UDP` 对应本地 `mieru_transport=UDP`。
2. `[USER]` 只接受白名单中的参数；`server_type`、普通传输参数和 `user_speed_limit` 不能写在那里。查看 [节点参数表](heki/heki-config.md#_221-可在-user-区修改的参数)。
3. 修改监听、证书或传输后，需要重启节点进程；用户同步不等于全部节点配置都会热更新。
4. 后端运行参数正确，不代表面板订阅也正确。自签证书 pin、SS 插件和 XHTTP 路径应同时检查客户端拿到的订阅。

SSPanel-UIM 继续使用 `mod_mu`，无需为这次更新改 API。XiaoV2Board V2 config / v2node 节点的数据请求仍保留兼容回退，不需要用户手动把所有节点改成另一种协议类型。

## 混合协议

heki 支持在同一实例中运行不同协议类型的节点。例如：

- 节点 250 跑 Shadowsocks
- 节点 251 跑 ShadowsocksR
- 节点 252 跑 Trojan

### 配置方式

方式一：通过 `heki node add` 命令添加节点（推荐）

节点已经加入 `node_id` 后，可以手动编辑节点配置文件 `/etc/heki/nodes/node_{id}.conf`，在 `[USER]` 区添加其他节点级覆盖参数，例如：
```
listen_addr=127.0.0.2
```

节点协议以面板下发为准；`[USER]` 区中的覆盖项仅影响监听地址、证书、同步参数和 VMess 认证默认值等支持项。
