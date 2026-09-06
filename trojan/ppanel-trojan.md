# ppanel 对接 trojan

## 第一步，在面板添加一个节点

在 ppanel 后台添加 Trojan 节点，配置端口、传输层、SNI 等参数。

ppanel 支持的 Trojan 传输层组合：
- tcp + tls（默认）
- tcp + reality
- websocket + tls
- httpupgrade + tls
- h2 + tls
- grpc + tls

当前 heki 已确认兼容 ppanel 下发的 `tcp` / `ws` / `httpupgrade` / `h2` / `grpc` / `xhttp` / `splithttp`。
无论 ppanel 写 `xhttp` 还是 `splithttp`，heki 都会在运行时统一按 `splithttp` 启动，不会静默退回 `tcp`。

## 第二步，配置 heki

!> Trojan 走 TLS 时需要证书；如果 ppanel 下发的是 Reality，则不需要外部证书。

```ini
type=ppanel
server_type=trojan
panel_url=https://your-ppanel.com
panel_key=your-secret-key
node_id=1

# TLS 模式下的证书配置（三选一）
# 方式一：自动申请（推荐，heki 会自动从面板获取域名申请证书）
cert_domain=your-domain.com
cert_mode=http

# 方式二：手动指定证书
# cert_file=/path/to/fullchain.pem
# key_file=/path/to/private.key

# 方式三：自签证书（客户端需开启 allow_insecure）
# cert_mode=self
```

如果 ppanel 下发的是 `security=reality`，heki 会直接使用面板返回的 Reality 参数，不需要本地额外配置证书。

参考: [heki 详细配置项](heki/heki-config.md)

## 第三步，启动 heki

```bash
heki start
```

若出现启动失败的情况，使用 `heki log` 查看错误信息。
