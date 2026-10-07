# ppanel 对接 tuic

## 第一步，在面板添加一个节点

在 ppanel 后台添加 TUIC V5 节点，配置端口、SNI、拥塞控制算法等参数。

可选配置项：
- `congestion_controller` / `quic_congestion_control`：PPanel V2 下发的拥塞控制字段（推荐 `cubic`，可选 `bbr`、`new_reno`）；heki 会归一化为内部 `congestion_control`
- `alpn`：TLS ALPN 列表，例如 `h3`、`h3-29`
- `auth_timeout`：认证超时，支持秒数和常见 duration 字符串
- `heartbeat`：心跳间隔，支持秒数和常见 duration 字符串
- `udp_relay_mode`：客户端字段，heki 服务端不使用
- `allow_insecure`：客户端字段，heki 服务端会忽略
- 官方 PPanel 当前只有 `ech_enable` / `ech_server_name` 这类订阅侧 ECH 元数据，没有服务端 ECH keyset 字段；需要 TUIC 服务端 ECH 时，可在 heki 本地配置 `tuic_ech_server_keys`

> TUIC V5 基于 QUIC/UDP 协议，中转服务器需要支持 UDP 转发

## 第二步，配置 heki

!> TUIC V5 必须配置 TLS 证书！！！

```ini
type=ppanel
server_type=tuic
panel_url=https://your-ppanel.com
panel_key=your-secret-key
node_id=1

# 证书配置（三选一）
# 方式一：自动申请（推荐，heki 会自动从面板获取域名申请证书）
cert_domain=your-domain.com
cert_mode=http

# 方式二：手动指定证书
# tuic_cert_file=/path/to/fullchain.pem
# tuic_key_file=/path/to/private.key

# 方式三：自签证书（客户端需开启 allow_insecure）
# cert_mode=self

# 面板没下发时可本地指定；若 PPanel 下发 `congestion_controller=bbr`，heki 会归一化后按 `bbr` 生效
# tuic_congestion_control=cubic
# tuic_auth_timeout=3
# tuic_heartbeat=10

# TUIC 服务端 ECH keyset（高级项；官方 PPanel 当前不会下发这个私钥材料）
# tuic_ech_server_keys=BASE64_ECH_KEYSET

# QUIC 接收窗口（MB；heki 本地默认 2 / 6 / 3 / 15）
# tuic_initial_stream_window=2
# tuic_max_stream_window=6
# tuic_initial_conn_window=3
# tuic_max_conn_window=15
```

参考: [heki 详细配置项](heki/heki-config.md)

## 第三步，启动 heki

```bash
heki start
```

若出现启动失败的情况，使用 `heki log` 查看错误信息。
