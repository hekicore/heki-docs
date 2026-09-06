# V2board / xiaov2board 对接 naive

!> 原版 V2Board 的实际兼容性取决于面板分支返回的 API 字段。若你的面板未返回 naive 所需字段，建议优先使用 XBoard / PPanel。
!> Naive 在 heki 内置实现中走 `HTTP/2 CONNECT over TLS`，请保持面板 TLS 开启。若面板分支下发 `tls=0`，heki 会解析该字段，但当前不会提供完整的明文 Naive 服务。

# 第一步，在面板添加一个节点

非常简单，教程省略

# 第二步，配置 heki

```ini
# xiaov2board 用这个
type=xiaov2board

# 原版 V2Board 改成 type=v2board
server_type=naive
panel_url=https://your-panel.com
panel_key=your-api-key
node_id=1
```

Naive 需要 TLS 证书；如果面板分支显式下发 `tls=0`，请在面板侧改为开启 TLS，或使用支持 TLS 字段的分支。

参考: [heki 详细配置项](heki/heki-config.md)

# 第三步，启动 heki

```
heki start
```

若出现启动失败的情况，使用`heki log`查看错误信息
