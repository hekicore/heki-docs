# ppanel 对接 vless

## 第一步，在面板添加一个节点

在 ppanel 后台添加 VLESS 节点，配置端口、传输层、安全类型等参数。

ppanel 支持的 VLESS 组合：
- tcp + reality + xtls-rprx-vision（推荐）
- tcp + tls + xtls-rprx-vision
- tcp + tls
- websocket + tls
- httpupgrade + tls
- grpc + tls
- h2 + tls

当前 heki 已确认兼容 ppanel 下发的 `tcp` / `ws` / `httpupgrade` / `h2` / `grpc` / `xhttp` / `splithttp`。
无论 ppanel 写 `xhttp` 还是 `splithttp`，heki 都会在运行时统一按 `splithttp` 启动，不会静默退回 `tcp`。

如果 ppanel 把 VLESS `flow` 下发成 `none`，heki 会按“未启用 flow”处理，等同于空字符串；普通 VLESS 客户端不会再因为服务端期望 `none`、客户端实际不携带 flow 而被拒绝。只有 `flow=xtls-rprx-vision` 会启用 Vision，并继续要求 `tcp + TLS/Reality`。

建议仅使用 `tcp + reality + xtls-rprx-vision` 组合

## Vision + decryption 配置说明

如果你在 ppanel 后台给 VLESS 节点开启了：

- `flow = xtls-rprx-vision`
- `encryption = mlkem768x25519plus`
- 或配套的 `encryption_mode / encryption_ticket / encryption_private_key / encryption_password / encryption_*_padding`

则 heki 会自动把这些 `encryption_*` 字段转换为服务端实际使用的 `decryption` 配置。

这一组配置在 heki 中的兼容规则是：

- 支持：`tcp + reality + xtls-rprx-vision + encryption_*`
- 支持：`tcp + tls + xtls-rprx-vision + encryption_*`
- 不支持：`tcp + none + xtls-rprx-vision + encryption_*`
- 不支持：`ws/grpc/h2 + xtls-rprx-vision + encryption_*`

也就是说，`Vision` 只能跑在 `tcp` 上，并且必须配 `TLS` 或 `Reality`。
如果面板把安全类型下发成 `none`，或者传输层不是 `tcp`，heki 会直接拒绝启动该节点，而不会再“看起来启动成功，实际协议不通”。

### ppanel 后台推荐写法

#### 方案一：Reality + Vision（推荐）

- 传输层：`tcp`
- 安全类型：`reality`
- flow：`xtls-rprx-vision`
- encryption：按面板实际支持填写 `mlkem768x25519plus` 及对应 `encryption_*` 参数

#### 方案二：TLS + Vision

- 传输层：`tcp`
- 安全类型：`tls`
- flow：`xtls-rprx-vision`
- encryption：按面板实际支持填写 `mlkem768x25519plus` 及对应 `encryption_*` 参数

#### 不要这样配

- 传输层：`tcp`
- 安全类型：`none`
- flow：`xtls-rprx-vision`
- encryption：`mlkem768x25519plus`

上面这组下发后，heki 会明确报错，因为 `Vision` 不能和明文 `security=none` 一起使用。

### 常见报错说明

如果看到下面的报错，说明面板下发的组合本身不合法：

```text
vless flow=xtls-rprx-vision requires tls or reality
```

这表示你使用了 `flow=xtls-rprx-vision`，但安全类型是 `none`。

```text
vless flow=xtls-rprx-vision requires transport=tcp
```

这表示你使用了 `flow=xtls-rprx-vision`，但传输层不是 `tcp`，例如 `ws`、`grpc` 或 `h2`。

## 第二步，配置 heki

```ini
type=ppanel
server_type=vless
panel_url=https://your-ppanel.com
panel_key=your-secret-key
node_id=1
```

Reality 模式不需要配置证书，heki 会自动从面板获取 Reality 相关参数。

普通 TLS 模式需要配置证书：

```ini
# 证书配置（三选一）
# 方式一：自动申请（推荐）
cert_domain=your-domain.com
cert_mode=http

# 方式二：手动指定证书
# cert_file=/path/to/fullchain.pem
# key_file=/path/to/private.key

# 方式三：自签证书（客户端需开启 allow_insecure）
# cert_mode=self
```

参考: [heki 详细配置项](heki/heki-config.md)

## 第三步，启动 heki

```bash
heki start
```

若出现启动失败的情况，使用 `heki log` 查看错误信息
