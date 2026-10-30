# V2board 对接 hysteria

!> 原版 V2Board 的实际兼容性取决于面板分支返回的 API 字段。若你的面板未返回 hysteria 所需字段，建议优先使用 XBoard / PPanel。

XiaoV2Board 使用 `type=xiaov2board`。支持其 `tls_settings.cert_mode=remote` 自签证书：Heki 安装面板下发的 `tls_cert` / `tls_key`，并在提供 `pinned_peer_cert_sha256` 时校验二者匹配。客户端的 `pinnedPeerCertSha256` / `pinSHA256` 校验的是叶证书 DER 的 SHA-256，不是公钥摘要。

无需再生成另一张本地自签证书。若手动指定本地证书，仍以手动配置优先，但必须保证订阅指纹与这张实际证书一致；否则客户端会拒绝连接。

# 第一步，在面板添加一个节点

非常简单，教程省略

# 第二步，配置 heki

!> hysteria 必须要配置证书！！！

参考: [heki 详细配置项](heki/heki-config.md)

# 第三步，启动 heki

```
heki start
```

若出现启动失败的情况，使用`heki log`查看错误信息
