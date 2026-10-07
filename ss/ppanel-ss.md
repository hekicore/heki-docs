# ppanel 对接 ss

> 使用 ss 密码单端口必看: [ss 密码单端口优化](other/ss-aead.md)

## 第一步，在面板添加一个节点

在 ppanel 后台添加 Shadowsocks 节点，配置端口和加密方式。

ppanel 支持的加密方式：

- aes-128-gcm
- aes-256-gcm
- chacha20-ietf-poly1305
- 2022-blake3-aes-128-gcm（SS2022）
- 2022-blake3-aes-256-gcm（SS2022）
- 2022-blake3-chacha20-poly1305（SS2022）

> SS2022 加密方式需要配置 `server_key`，heki 会自动处理密钥的 base64 编码转换

### Shadowsocks 插件

heki 会读取 ppanel 下发的结构化 `plugin_opts`，目前支持：

| 插件 | 服务端支持范围 |
|---|---|
| `obfs` | `http`、`tls` |
| `v2ray-plugin` | WebSocket，可选 TLS |
| `gost-plugin` | WebSocket，可选 TLS |
| `shadow-tls` | v1-v3，支持 `strict-mode` |
| `restls` | 解析 `password`、`dest`、`restls-script`、`min-record-len`；服务端需要外部 Restls 进程 |
| `kcptun` | KCP、FEC、窗口、smux、`framesize` 等服务端参数 |

`v2ray-plugin` / `gost-plugin` 的 mux，以及 `v2ray-http-upgrade` 会改变协议帧或握手方式，当前不会静默降级；heki 会明确报错并停止节点启动。kcptun 的 `conn`、`autoexpire`、`scavengettl`、`ratelimit` 属于客户端运行控制，不参与服务端监听。

Shadow-TLS 的密码规则取决于协议版本：

| 版本 | `password` | 说明 |
|---|---|---|
| v1 | 不需要 | v1 协议不使用 Shadow-TLS 密码；只需配置可访问的握手服务器 |
| v2 | 必填 | 必须与客户端一致；PPanel 未填写版本时默认按 v2 处理 |
| v3 | 必填 | 必须与客户端一致；支持 `strict-mode` |

无密码的 v1 节点会直接启动 heki 内置 Shadow-TLS 服务，不会回退成裸 Shadowsocks。PPanel 下发的 v2/v3 节点缺少密码时会在配置解析阶段明确报错。

使用 `v2ray-plugin` / `gost-plugin` 的 TLS 模式时，需要在 ppanel 节点中同时配置 SNI 和证书模式。Shadow-TLS 借用远端握手服务器，不需要给 heki 配置站点证书。

## 第二步，配置 heki

```ini
type=ppanel
server_type=ss
panel_url=https://your-ppanel.com
panel_key=your-secret-key
node_id=1
```

参考: [heki 详细配置项](heki/heki-config.md)

## 第三步，启动 heki

```bash
heki start
```

若出现启动失败的情况，使用 `heki log` 查看错误信息
