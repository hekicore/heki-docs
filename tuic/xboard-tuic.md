# Xboard 对接 TUIC V5

# 第一步，在面板添加一个节点

在 Xboard 面板中添加 TUIC 节点，配置 `congestion_control`（拥塞控制算法，推荐 `cubic`）、`server_name`（TLS SNI 域名）等参数。

# 第二步，配置 heki

!> TUIC V5 基于 QUIC/UDP 协议，必须配置 TLS 证书！

```ini
type=xboard
server_type=tuic
panel_url=https://your-panel.com
panel_key=your-api-key
node_id=1

# 证书配置（三选一）
# 方式一：手动指定证书
# tuic_cert_file=/path/to/cert.pem
# tuic_key_file=/path/to/key.pem

# 方式二：自动申请（推荐，面板配置了 server_name 域名时自动申请）
# cert_domain=your-domain.com
# cert_mode=http

# 方式三：自签证书（无需域名，客户端需开启 allow_insecure）
# cert_mode=self
```

可选 TUIC 配置项：

```ini
# 拥塞控制算法（默认 cubic，可选 bbr、new_reno；若面板下发 `congestion_control=bbr`，则按 bbr 生效）
# tuic_congestion_control=cubic

# ALPN 协议（默认 h3）
# tuic_alpn=h3

# 0-RTT 握手（默认 true；对接面板时通常以面板下发值为准）
# tuic_zero_rtt_handshake=true

# 认证超时（秒；对接面板时通常以面板下发值为准）
# tuic_auth_timeout=3

# 心跳间隔（秒；对接面板时通常以面板下发值为准）
# tuic_heartbeat=10

# ECH keyset（base64；XBoard 若下发 ech_server_keys/ech_key，heki 会自动接入）
# tuic_ech_server_keys=BASE64_ECH_KEYSET

# QUIC 接收窗口（MB；heki 本地默认 2 / 6 / 3 / 15）
# tuic_initial_stream_window=2
# tuic_max_stream_window=6
# tuic_initial_conn_window=3
# tuic_max_conn_window=15

# 禁用 UDP 转发
# tuic_disable_udp=false
```

### XBoard 对接补充

- 面板显式下发的具体 `listen_ip` 会作为节点监听地址输入；若返回 `0.0.0.0 / ::` 这类通配地址，heki 会视为默认值而忽略
- `base_config.push_interval` / `pull_interval` / `node_report_min_traffic` / `device_online_min_traffic` 会自动接入运行参数
- 若面板下发 `server_name`、`congestion_control`、`zero_rtt_handshake`、`auth_timeout`、`heartbeat`，heki 会按面板值生效
- 若面板下发 `ech_server_keys` / `ech_key`，heki 会接入 TUIC TLS；启用后服务端要求 TLS 1.3
- 若本地和面板都没显式填写 TUIC 窗口，heki 会显式写入 `2 / 6 / 3 / 15 MB` 的 QUIC 接收窗口
- 当前面板里的 `disable_sni` 主要给订阅/客户端使用，不是 heki 服务端入站开关
- 当前面板里的 `allow_insecure` 也是客户端字段，heki 服务端会忽略
- 若面板补了 `cert_config`，且本地证书项为空，heki 会在启动时自动补全证书模式和证书来源
- 若面板下发的是 `cert_mode=content`，heki 会把 PEM 证书内容安装到本地托管目录，并复用现有 TLS 热加载路径；兼容 `public_key/private_key`、`cert_content/key_content`、`cert/key` 等常见字段别名
- 证书优先级为 `本地手动证书 > 面板下发证书内容 > 自动申请证书`；如果你已经显式填写 `cert_file/key_file` 或 `tuic_cert_file/key_file`，面板 cert push 不会覆盖它们

参考: [heki 详细配置项](heki/heki-config.md)

# 第三步，启动 heki

```
heki start
```

若出现启动失败的情况，使用 `heki log` 查看错误信息。
