# V2board 对接 hysteria

!> 原版 V2Board 的实际兼容性取决于面板分支返回的 API 字段。若你的面板未返回 hysteria 所需字段，建议优先使用 XBoard / PPanel。

XiaoV2Board 使用 `type=xiaov2board`。支持其 `tls_settings.cert_mode=remote` 自签证书：Heki 安装面板下发的 `tls_cert` / `tls_key`，并在提供 `pinned_peer_cert_sha256` 时校验二者匹配。客户端的 `pinnedPeerCertSha256` / `pinSHA256` 校验的是叶证书 DER 的 SHA-256，不是公钥摘要。

无需再生成另一张本地自签证书。若手动指定本地证书，仍以手动配置优先，但必须保证订阅指纹与这张实际证书一致；否则客户端会拒绝连接。

# 第一步，在面板添加一个节点

XiaoV2Board 添加 Hysteria2 节点后，在面板配置远程证书模式，确保节点 API 返回 `tls_settings.cert_mode=remote`、`tls_cert`、`tls_key`、`server_name` 及证书 pin。具体输入框名称按面板分支为准；不要把这些面板 JSON 字段直接粘贴进 `heki.conf`。

# 第二步，配置 heki

!> hysteria 必须要配置证书！！！

XiaoV2Board 已下发 remote 证书时，后端只需要正常面板对接配置，不要再指定另一张本地证书：

```ini
type=xiaov2board
server_type=hysteria
panel_url=https://panel.example.com
panel_key=YOUR_PANEL_API_KEY
node_id=1
```

这里不需要额外填写 `cert_mode=self`。本地已有 `cert_file` / `key_file` 或 `hysteria_cert_file` / `hysteria_key_file` 时会优先使用本地证书，必须同步对应订阅 pin。修改证书来源后重启 Heki 并刷新订阅。

### 客户端如何验证自签证书

先检查面板订阅是否实际包含证书 pin。各客户端字段不同，不能互相照抄：

| 客户端格式 | 证书指纹字段 |
|---|---|
| 官方 Hysteria2 YAML | `tls.pinSHA256` |
| Mihomo Hysteria2 节点 | `fingerprint` |

官方 Hysteria2 客户端最小示例：

```yaml
server: node.example.com:443
auth: YOUR_SUBSCRIPTION_AUTH
tls:
  sni: node.example.com
  pinSHA256: REPLACE_WITH_CERTIFICATE_SHA256_HEX
socks5:
  listen: 127.0.0.1:1080
```

地址、端口、auth 和 SNI 应使用面板订阅的实际值；启用了 Salamander 时还需客户端配置相同 obfs 类型和密码。pin 是实际叶证书的 SHA-256，可在服务端运行 `openssl x509 -in /path/to/cert.pem -noout -fingerprint -sha256` 获取，填入等号后摘要。错误 pin 会拒绝连接；更换证书后要重新获取 pin 并更新订阅。`client-fingerprint` 是浏览器握手指纹，不能代替证书 pin。

设置后端 `hysteria_allow_insecure=true` 不会替客户端跳过验证，该项在服务端被忽略。PPanel 的模板补丁操作另见 [PPanel Hy2](hysteria/ppanel-hysteria.md)。

参考: [heki 详细配置项](heki/heki-config.md)

# 第三步，启动 heki

```
heki start
```

若出现启动失败的情况，使用`heki log`查看错误信息
