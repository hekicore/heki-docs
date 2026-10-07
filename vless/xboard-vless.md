# Xboard 对接 vless

# 第一步，在面板添加一个节点

非常简单，教程省略。

建议仅使用 `tcp + reality + xtls-rprx-vision` 组合。

当前 heki 已确认支持 XBoard server config 下发的 `tcp` / `ws` / `httpupgrade` / `h2` / `grpc` / `xhttp`。
面板下发的 `xhttp` 会在运行时规范化为 `splithttp`，按内置 Xray-core listener 启动，不会静默退回 `tcp`。

如果 XBoard / XiaoV2Board 把 VLESS `flow` 下发成 `none`，heki 会按“未启用 flow”处理，等同于空字符串。只有 `flow=xtls-rprx-vision` 会启用 Vision，并继续要求 `tcp + TLS/Reality`。

# 第二步，配置 heki

```ini
type=xboard
server_type=vless
panel_url=https://your-xboard.com
panel_key=your-api-key
node_id=1

# 如果你的 XBoard 仍是旧 UniProxy 接口，可手动切回 V1
# xboard_api_version=1
```

### XHTTP / SplitHTTP 配置说明

- XBoard 面板里写 `network=xhttp` 即可，heki 运行时会统一按 `splithttp` listener 启动
- `network_settings.path` / `network_settings.host` 仍分别对应 heki 的 `vless_h2_path` / `vless_h2_host`
- `network_settings.mode` 会映射到运行时 `xhttp_mode`
- `network_settings.extra` 会映射到运行时 `xhttp_extra`
- XBoard 常见模版里，`xhttp_extra` 支持 `"16-32"`、`"8"`、`"true"` 这类字符串写法，heki 会自动归一化
- 如果默认模版里带了不完整的 `downloadSettings` 占位对象，例如只有 `path` / `mode`，heki 会自动忽略，不会因此导致节点启动失败
- 如果你显式写了完整 `downloadSettings`，但值本身非法，例如 `network=ws`，heki 仍会直接报错，避免把真实配置错误静默吞掉
- `splithttp` 当前不能与 `proxy_protocol` 或 `mptcp` 同开

一个常见的 XBoard `protocol_settings` 示例可以写成这样：

```json
{
  "network": "xhttp",
  "tls": 1,
  "flow": "",
  "tls_settings": {
    "server_name": "node.example.com"
  },
  "network_settings": {
    "path": "/xhttp",
    "host": "node.example.com",
    "mode": "auto",
    "extra": {
      "no_sse_header": "true",
      "xmux": {
        "max_concurrency": "16-32"
      }
    }
  }
}
```

- 若 `tls=1`，仍需要可用证书；可以使用本地手动证书、自动申请，或让面板通过 `cert_config` 下发证书内容
- 若 `tls=2`，heki 会直接按 Reality 启动，不需要外部证书
- 若 `cert_config` 下发的是 `cert_mode=content`，heki 会先安装面板下发的 PEM 内容，再按现有 TLS 热加载链路启动

### TLS / 证书补全

- 面板若下发 `cert_config`，heki 会在本地证书项为空时自动补全 `cert_mode`、`cert_domain`、`cert_file`、`key_file`、`dns_provider`
- 若面板下发的是 `cert_mode=content`，heki 会把 PEM 证书内容安装到本地托管目录，并复用现有 TLS 热加载路径；兼容 `public_key/private_key`、`cert_content/key_content`、`cert/key` 等常见字段别名
- 证书优先级为 `本地手动证书 > 面板下发证书内容 > 自动申请证书`；如果你已经显式填写 `cert_file/key_file` 或 `vless_cert_file/key_file`，面板 cert push 不会覆盖它们
- 若面板下发的是 `tls=2`，heki 会直接映射 Reality 参数并按 Reality 启动，不再要求本地证书
- 面板若下发 `tls_settings.reject_unknown_sni=1`，heki 会在 TLS 握手阶段校验客户端 SNI；优先使用 `server_name`，若未显式给出则会尝试从当前协议的有效 host/SNI 推导

### VLESS Encryption 服务端入口

- 面板若直接下发 `decryption`，heki 会直接使用
- 若面板下发的是 `mlkem768x25519plus + encryption_settings`，heki 会自动转换成服务端 `decryption`
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
