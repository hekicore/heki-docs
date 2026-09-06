# V2board / xiaov2board 对接 vless

!> 原版 V2Board 的实际兼容性取决于面板分支返回的 API 字段。若你的面板未返回 VLESS / Reality 所需字段，建议优先使用 XBoard / PPanel。
!> 已适配的 `xiaov2board` `v2node` 分支可下发 `listen_ip`、`base_config`、`routes`、`encryption_settings` 等字段，heki 会按当前支持范围接入。

# 第一步，在面板添加一个节点

非常简单，教程省略。

建议仅使用 `tcp + reality + xtls-rprx-vision` 组合。

当前 heki 已确认支持 `tcp` / `ws` / `httpupgrade` / `h2` / `grpc` / `xhttp`。
对 `xiaov2board` `v2node` 下发的 `xhttp`，heki 会在运行时规范化为 `splithttp`，不会静默退回 `tcp`。

# 第二步，配置 heki

```ini
# xiaov2board 用这个
type=xiaov2board

# 如果你是原版 V2Board，改成 type=v2board
server_type=vless
panel_url=https://your-panel.com
panel_key=your-api-key
node_id=1

# 旧版 xiaov2board 若 V2 config 不可用，可强制走 V1
# xboard_api_version=1
```

Reality 模式不需要外部证书；若你的面板分支下发的是普通 TLS，则仍需要可用证书。

### 面板字段补充

- `xiaov2board` 若显式下发具体 `listen_ip`，heki 会把它作为节点监听地址输入；若返回 `0.0.0.0 / ::` 这类通配地址，heki 会视为默认值而忽略
- `base_config.push_interval` / `pull_interval` / `node_report_min_traffic` / `device_online_min_traffic` 会自动接入运行参数
- 面板 `routes` / `custom_outbounds` / `custom_routes` JSON 现在会自动转换为 heki 本地路由模型；匹配时优先按面板路由执行，未命中再继续匹配本地 `routes_file` / `routes_url`（未显式配置 `routes_file` 时默认回退到同目录 `routes.toml`）
- 若面板路由里使用了 heki 当前无法承载的字段或出站类型，启动时会明确报出具体规则位置和不支持字段

### VLESS Encryption 服务端入口

- `xiaov2board` `v2node` 若下发 `mlkem768x25519plus + encryption_settings`，heki 会自动转换为服务端 `decryption`
- 也可以本地手工写 `vless_decryption`：

```ini
# 留空则关闭
# vless_decryption=mlkem768x25519plus.native.600s.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
```

!> `vless_decryption` 可与 `xtls-rprx-vision` 一起使用，前提是传输层为 `tcp`，且启用了 TLS 或 Reality；当前不支持与 fallback 同时使用。

参考: [heki 详细配置项](heki/heki-config.md)

# 第三步，启动 heki

```
heki start
```

若出现启动失败的情况，使用 `heki log` 查看错误信息。
