# V2board / xiaov2board 对接 TUIC V5

!> 原版 V2Board 的实际兼容性取决于面板分支返回的 API 字段。若你的面板未返回 TUIC 所需字段，建议优先使用 XBoard / PPanel。
!> 已适配的 `xiaov2board` `v2node` 分支可下发 `listen_ip`、`zero_rtt_handshake`、`congestion_control`、`auth_timeout`、`heartbeat` 等字段。

# 第一步，在面板添加一个节点

在面板中添加 TUIC 节点。

# 第二步，配置 heki

!> TUIC V5 基于 QUIC/UDP 协议，必须配置 TLS 证书！

```ini
# xiaov2board 用这个
type=xiaov2board

# 原版 V2Board 改成 type=v2board
server_type=tuic
panel_url=https://your-panel.com
panel_key=your-api-key
node_id=1

# 证书配置（三选一）
# 方式一：手动指定证书
# tuic_cert_file=/path/to/cert.pem
# tuic_key_file=/path/to/key.pem

# 方式二：自动申请（推荐）
# cert_domain=your-domain.com
# cert_mode=http

# 方式三：自签证书（无需域名，客户端需开启 allow_insecure）
# cert_mode=self

# 拥塞控制算法（默认 cubic；若面板下发 congestion_control=bbr，则按 bbr 生效）
# tuic_congestion_control=cubic

# 0-RTT 握手（默认 true；xiaov2board 下发该字段时会按面板值生效）
# tuic_zero_rtt_handshake=true

# 认证超时与心跳（面板没下发时可本地指定）
# tuic_auth_timeout=3
# tuic_heartbeat=10

# QUIC 接收窗口（MB；heki 本地默认 2 / 6 / 3 / 15）
# tuic_initial_stream_window=2
# tuic_max_stream_window=6
# tuic_initial_conn_window=3
# tuic_max_conn_window=15
```

### xiaov2board 对接补充

- `xiaov2board` 显式下发的具体 `listen_ip` 会作为节点监听地址输入；若返回 `0.0.0.0 / ::` 这类通配地址，heki 会视为默认值而忽略
- `zero_rtt_handshake`、`congestion_control`、`server_name`、`auth_timeout`、`heartbeat` 会自动接入 TUIC 运行配置；例如面板显式下发 `congestion_control=bbr` 时，heki 会直接按 `bbr` 启动
- 若本地和面板都没显式填写 TUIC 窗口，heki 会显式写入 `2 / 6 / 3 / 15 MB` 的 QUIC 接收窗口
- 面板里的 `disable_sni` 主要给订阅/客户端使用，不是 heki 服务端入站开关
- 面板里的 `allow_insecure` 也是客户端字段，heki 服务端会忽略

参考: [heki 详细配置项](heki/heki-config.md)

# 第三步，启动 heki

```
heki start
```

若出现启动失败的情况，使用 `heki log` 查看错误信息。
