# PPanel 对接 ShadowsocksR

## 第一步，在面板添加节点

在 PPanel 后台添加 ShadowsocksR 节点。heki 会读取 `cipher`、`server_key`、`protocol`、`protocol_param`、`obfs` 和 `obfs_param`。

PPanel 当前支持的组合：

- 加密：`none`、AES-CTR、AES-CFB、`rc4-md5`、`chacha20`、`chacha20-ietf`
- 协议：`auth_aes128_md5`、`auth_aes128_sha1`、`auth_chain_a`
- 混淆：`plain`、`http_simple`、`http_post`、`tls1.2_ticket_auth`、`tls1.2_ticket_fastauth`

以上协议可以和列出的混淆组合使用。PPanel SSR 节点会使用协议单端口模式识别用户；当混淆不是 `plain` 时，heki 会先完成 HTTP 或 fake TLS 握手并剥离混淆层，再交给 `auth_aes128_*` / `auth_chain_*` 做用户认证和流量解密。服务端响应会重新封装成客户端选择的混淆格式。

| 混淆 | 服务端处理 |
|---|---|
| `plain` | 直接进入 SSR 协议认证 |
| `http_simple` / `http_post` | 解析首个 HTTP 请求并返回 HTTP 响应头 |
| `tls1.2_ticket_auth` / `tls1.2_ticket_fastauth` | 校验 fake TLS ClientHello、HMAC 和时间窗，后续使用 TLS application record 承载 SSR 流量 |

未列出的 obfs 不会静默降级。若对应组合没有服务端实现，heki 会在节点启动时明确报错，避免节点看似启动成功但客户端无法握手。

## 第二步，配置 heki

```ini
type=ppanel
server_type=ssr
panel_url=https://your-ppanel.com
panel_key=your-secret-key
node_id=1
```

参考: [heki 详细配置项](heki/heki-config.md)

## 第三步，启动 heki

```bash
heki start
```

若出现启动失败的情况，使用 `heki log` 查看错误信息。
