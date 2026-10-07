# 域名嗅探（Domain Sniff）

## 功能说明

当客户端连接到 heki 时，有些客户端只传递目标 IP 地址而不传递域名。域名嗅探功能可以从连接的首包数据中探测出实际访问的域名。

只有当客户端传给 heki 的目标地址本身是 `IP:端口` 时，heki 才会尝试嗅探；如果客户端已经直接传了域名，则不会额外探测或改写目标。

探测到的域名可用于：
- 审计规则匹配（基于域名而非 IP 进行审计）
- 路由分流（基于域名匹配路由规则）
- DNS 重解析（`sniff_redirect`，探测到域名后重新解析 IP）

> 路由提示：当 `routes` 已启用且 `sniff_redirect=false` 时，heki 仍会把嗅探到的域名交给路由层做匹配。即使客户端最初只传了 `IP:端口`，`geosite:`、`domain:`、`domain-suffix:`、`domain-keyword:` 这类规则也可以命中。

## 配置参数

| 参数名              | 默认值          | 说明                                                                 |
|------------------|--------------|----------------------------------------------------------------------|
| `domain_sniff`   | `tls,http,quic` | 主动探测域名的协议类型，以逗号分隔。设为空则不探测                                     |
| `sniff_redirect` | `false`      | 是否开启探测域名重解析。开启后，若客户端只传 IP 给 heki，探测出域名后会重新解析该域名获取新 IP 并使用新 IP 连接 |

### domain_sniff 支持的协议

| 协议     | 说明                                    |
|--------|---------------------------------------|
| `tls`  | 从 TLS ClientHello 的 SNI 字段探测域名        |
| `http` | 从 HTTP 请求的 Host 头探测域名                 |
| `quic` | 从 QUIC Initial 包的 SNI 字段探测域名          |

> 这里的 `quic` 指的是“被代理目标流量的首包是 QUIC Initial 时，尝试从里面提取 SNI”，不是指 Hysteria2 / TUIC 这类入站协议本身。

## 支持的代理协议

域名嗅探当前已集成到以下代理协议中：

- VMess / VLESS
- Shadowsocks / ShadowsocksR
- Trojan
- AnyTLS
- Mieru

!> Naive 当前走 HTTP/2 CONNECT 隧道转发，目标通常直接体现在 CONNECT 的 `authority` 中，服务端不会在该隧道内额外 peek 首包，因此不参与 `domain_sniff`

!> Hysteria2 / TUIC 为 QUIC 入站，不走这套 TCP 首包 peek 流程，因此也不参与 `domain_sniff`

## 配置示例

### 默认配置（推荐）

默认已开启 TLS、HTTP、QUIC 三种协议的域名探测：
```
domain_sniff=tls,http,quic
```

### 开启域名重解析

适用于需要基于域名进行 DNS 分流的场景：
```
domain_sniff=tls,http,quic
sniff_redirect=true
```

开启后，探测到域名时会按 `面板运行时 DNS > dns.yml > default_dns > 系统 DNS` 的优先级重新解析；如果没有面板下发的运行时 DNS，就从本地 `dns.yml` 开始匹配。

### 仅用于域名路由，不改写出站 IP

适用于你只想让嗅探出的域名参与 `routes.toml` 分流，但不想改写实际出站 IP 的场景：
```
domain_sniff=tls,http,quic
sniff_redirect=false
```

这时 heki 会保留原始目标地址用于真实连接，但会把嗅探出的域名交给审计和路由层匹配。

调试日志里的 `Sniff route target` 表示“用于路由匹配的目标”，不是最终拨号目标；真实连接仍会使用客户端传入的原始 `IP:端口`。

### 仅探测 TLS

如果只需要探测 HTTPS 流量的域名：
```
domain_sniff=tls
```

### 关闭域名嗅探

```
domain_sniff=
```

## sniff_redirect 工作原理

1. 客户端连接 heki，目标地址为 `1.2.3.4:443`
2. heki 从首包数据探测到域名 `www.example.com`
3. heki 重新解析 `www.example.com`，得到新 IP `5.6.7.8`
4. heki 使用 `5.6.7.8:443` 建立出站连接

这在以下场景中有用：
- 客户端使用了自定义 DNS 解析，导致目标 IP 不是最优的
- 配合 DNS 规则实现基于域名的分流

## 补充说明

- `domain_sniff=` 设为空时，heki 会直接关闭这套探测回调，避免 VLESS / AnyTLS / Trojan / Mieru 等协议为了嗅探而额外 peek 首包
- 嗅探只基于首包内容，能否识别出域名取决于首包里是否真的带有 SNI 或 Host 信息
- 如果你的 `routes.toml` 主要写的是 `geosite:`、`domain:`、`domain-suffix:`、`domain-keyword:`，而客户端又经常只上传目标 IP，建议保留 `domain_sniff`；否则这类规则天然更难命中
