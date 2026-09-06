# ppanel 对接 naive

## 第一步，在面板添加一个节点

在 ppanel 后台添加 Naive 节点，配置端口和 SNI。

Naive 使用 HTTP/2 CONNECT 代理协议，heki 内置实现当前走 TLS 模式，请在 ppanel 里使用 `security=tls`。

## 第二步，配置 heki

!> Naive 当前可用路径需要 TLS 证书；若 ppanel 下发 `security=none`，heki 会解析该字段，但不会提供完整的明文 Naive 服务。

```ini
type=ppanel
server_type=naive
panel_url=https://your-ppanel.com
panel_key=your-secret-key
node_id=1

# TLS 模式下的证书配置（三选一）
# 方式一：自动申请（推荐，heki 会自动从面板获取域名申请证书）
cert_domain=your-domain.com
cert_mode=http

# 方式二：手动指定证书
# naive_cert_file=/path/to/fullchain.pem
# naive_key_file=/path/to/private.key

# 方式三：自签证书（客户端需开启 allow_insecure）
# cert_mode=self
```

如果面板下发的是 `security=none`，请在面板侧改为 `security=tls`，并按上面三种方式之一配置证书。

参考: [heki 详细配置项](heki/heki-config.md)

## 第三步，启动 heki

```bash
heki start
```

若出现启动失败的情况，使用 `heki log` 查看错误信息
