# SSPanel-UIM 对接 TUIC V5

# 第一步，在面板添加一个节点

在 SSPanel-UIM 面板中添加 TUIC 节点（sort=2），在 `custom_config` 中配置端口、拥塞控制等参数。

custom_config 示例：
```json
{
  "offset_port_node": 443,
  "host": "your-domain.com",
  "congestion_control": "cubic",
  "alpn": ["h3"]
}
```

# 第二步，配置 heki

!> TUIC V5 基于 QUIC/UDP 协议，必须配置 TLS 证书！

```ini
type=sspanel-uim
server_type=tuic
panel_url=https://your-panel.com
panel_key=your-api-key
node_id=1

# 证书配置（三选一）
# 方式一：手动指定证书
# tuic_cert_file=/path/to/cert.pem
# tuic_key_file=/path/to/key.pem

# 方式二：自动申请（推荐，面板配置了 host 域名时自动申请）
# cert_domain=your-domain.com
# cert_mode=http

# 方式三：自签证书（无需域名，客户端需开启 allow_insecure）
# cert_mode=self

# 面板没下发时可本地指定；若面板下发 `congestion_control=bbr`，heki 会直接按 `bbr` 生效
# tuic_congestion_control=cubic
# tuic_zero_rtt_handshake=true
# tuic_auth_timeout=3
# tuic_heartbeat=10
# QUIC 接收窗口（MB；heki 本地默认 2 / 6 / 3 / 15）
# tuic_initial_stream_window=2
# tuic_max_stream_window=6
# tuic_initial_conn_window=3
# tuic_max_conn_window=15
```

参考: [heki 详细配置项](heki/heki-config.md)

# 第三步，启动 heki

```
heki start
```

若出现启动失败的情况，使用`heki log`查看错误信息
