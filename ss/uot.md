# Shadowsocks UoT v1/v2

Heki 的 SS AEAD / SS2022 入口支持 UDP over TCP（UoT）v1/v2，包括 v2 固定目标和多目标模式。不需要增加服务端开关，客户端必须自行支持并启用 UoT。

UoT 将 UDP 数据报封装到 Shadowsocks TCP 连接中。它与 VMess/VLESS 使用的 XUDP 是不同的封装，不能混用，也不会改变 SS/SS2022 的加密、nonce、chunk 或普通 UDP session 格式。

## 使用条件

- 节点使用 Heki 支持的 SS AEAD 或 SS2022 cipher，客户端与服务端配置一致。
- 客户端支持所选 UoT 版本，并在 Shadowsocks 出站中启用 `udp_over_tcp`。
- 客户端需要代理 UDP 目标；仅启用 TCP 转发不会自动获得 UoT 能力。
- ShadowTLS 本身不承载原生 UDP，使用 ShadowTLS 插件时如需 UDP，也应在内层 Shadowsocks 出站启用 UoT。

Heki 支持 v1/v2，但具体使用哪个版本以及固定目标或多目标模式取决于客户端实现和配置，请参考对应客户端文档。

## sing-box 示例

以下是 Shadowsocks 出站的关键配置。将地址、端口、加密方法和密码替换为实际节点值：

```json
{
  "type": "shadowsocks",
  "tag": "ss-uot",
  "server": "node.example.com",
  "server_port": 443,
  "method": "2022-blake3-aes-256-gcm",
  "password": "your-ss-password",
  "udp_over_tcp": true
}
```

使用 ShadowTLS 时，`udp_over_tcp` 仍配置在内层 `shadowsocks` 出站，而不是 `shadowtls` 出站。完整的 ShadowTLS + sing-box 配对示例见 [XBoard Shadowsocks 客户端配置](ss/xboard-ss.md#客户端配置示例)。

## 服务端行为

- 实际 UDP 目标继续执行节点目标限制、审计与出口规则、UDP 路由、限速和流量统计。
- 每条 UoT 连接最多同时保留 256 个目标，空闲目标按 `udp_timeout` 回收。
- 普通原生 UDP 入口不受此功能影响，不需要为了启用 UoT 修改监听端口或额外增加配置。
- UoT 只是传输封装，不会绕过 BT 过滤、黑白名单、出口封禁或用户限制。

## 无法使用时排查

1. 确认客户端确实支持 Shadowsocks UoT，而不是只支持 VMess/VLESS XUDP。
2. 确认 `udp_over_tcp` 写在 Shadowsocks 出站上；使用 ShadowTLS 时不要误写到插件出站。
3. 核对两端 cipher、密码、端口及插件配置是否一致。
4. 检查客户端请求是否包含 UDP 目标，以及服务端路由、审计和出口规则是否允许该目标。
5. 若连接建立后空闲目标被回收，检查 `udp_timeout` 和客户端保活行为；不要通过调大超时绕过目标限制或审计规则。
