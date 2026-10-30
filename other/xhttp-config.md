# XHTTP 配置与证书验证

## 先分清配置放在哪里

Heki 的 VMess、VLESS、Trojan、AnyTLS 入站支持 XHTTP，运行时名称为 `splithttp`。入站支持不代表路由出站也支持 XHTTP；`routes.toml` 的出站传输范围见 [路由文档](other/routes-config.md)。

| 配置来源 | 写法 |
|---|---|
| 面板节点协议 JSON | `network=xhttp`，`network_settings` / `networkSettings` 中填写 path、host、mode、extra |
| Heki 主配置 | 使用 `vmess_transport` / `vless_transport` / `trojan_transport` / `anytls_transport`；路径和 Host 使用对应 `*_h2_path` / `*_h2_host` |
| 客户端 | 使用客户端支持的 XHTTP 配置，路径、Host、安全类型等与服务端对应 |

`xhttp_mode` / `xhttp_extra` 是面板字段映射后的运行信息，不是可直接粘贴到 `heki.conf` 的配置键。`downloadSettings` 也不是所有 XHTTP 节点都必须填写的部分；没有下载分离需求时不要为了跟示例一致额外添加。

XBoard 官方默认模板已覆盖 VMess/VLESS/Trojan；AnyTLS 的官方 server config 尚未完整返回 network/networkSettings，需使用能下发这些字段的分支或按本地支持范围配置，并单独保证客户端订阅正确。

## 普通 VLESS + XHTTP + TLS 示例

在面板相应协议配置中使用以下结构，实际字段位置以面板编辑器为准：

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
      "noSSEHeader": true,
      "xmux": { "maxConcurrency": "16-32" }
    }
  }
}
```

Heki 仍需要该域名的有效服务端证书，可配置手动证书或自动申请。客户端使用同样的 path/host，VLESS flow 留空；Vision 不能与 XHTTP 同开。

兼容范围包括字符串数字/范围、布尔字符串、headers 数组及新旧 session 字段。不完整的 downloadSettings 占位对象会忽略；显式提供了完整对象但内容不合法时会报错，例如其中 `network=ws` 不受支持。

## allowInsecure=true 升级后怎么处理

它原本表示“不验证对方证书”。Heki 1.2.9 使用的新版 Xray 不再接受 `downloadSettings.tlsSettings.allowInsecure=true`。只有使用这项下载端 TLS 配置的节点需要迁移，不是所有 Heki 节点都要重新申请证书。

### 方法一：下载服务器使用可信证书

确有下载分离需求时，在原来的 extra 中保留正确地址、端口、路径，删除 `allowInsecure=true`，例如：

```json
{
  "downloadSettings": {
    "address": "download.example.com",
    "port": 443,
    "network": "xhttp",
    "security": "tls",
    "tlsSettings": {
      "serverName": "download.example.com",
      "alpn": ["h2"]
    },
    "xhttpSettings": {
      "path": "/download",
      "host": "download.example.com"
    }
  }
}
```

证书需被客户端信任、未过期且覆盖 serverName。受信任的免费 ACME 证书也可以，不要求购买证书。地址和路径必须指向已配置好的 XHTTP 下载端，仅复制该对象不会自动部署下载服务器。

### 方法二：固定自签证书指纹（pin）

先从下载服务器实际使用的证书文件计算叶证书 SHA-256：

```bash
openssl x509 -in /path/to/download-cert.pem -noout -fingerprint -sha256
```

取输出中等号后面的十六进制指纹，填入原对象的 `tlsSettings`：

```json
{
  "serverName": "download.example.com",
  "alpn": ["h2"],
  "pinnedPeerCertSha256": ["REPLACE_WITH_CERTIFICATE_SHA256_HEX"]
}
```

占位值必须替换为 64 位十六进制摘要，也接受冒号分隔形式。这里是**整张叶证书 DER 的 SHA-256**，不是公钥 SPKI hash、Reality 公钥或浏览器 fingerprint。不要同时保留 `allowInsecure=true`。

pin 的作用是只接受指定证书。首次获取指纹应通过自己的服务器配置或可信渠道；换证书后摘要会变化，要同步更新使用该 pin 的下载配置/客户端配置。可信证书方案正常续签时通常不需要手工改 pin。

## 监听与前置代理

- `listen` 留空时绑定通配地址，`localhost` 会归一化；域名型监听地址会报错，应填写本机可绑定 IP。
- XHTTP 不能与 `proxy_protocol` 或 `mptcp=true` 同开；它们不是修复 UDP 的开关。
- 前面有 nginx/caddy 终止 TLS 时，才考虑 `force_close_ssl=true`，并确保前后端路径、Host、安全类型一致。
- 如需恢复真实 IP，使用面板支持的可信 HTTP 头设置，且限制后端仅由可信代理访问，详见 [中转获取真实 IP](other/forward-get-real-ip.md)。

常见排查：启动提示 allowInsecure 错误就检查下载端 TLS；pin 不匹配就核对实际服务的证书；路径或 Host 不同则核对面板、前置代理和客户端三处配置。修改后重启 Heki，并刷新涉及变更的客户端订阅。
