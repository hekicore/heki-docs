# Heki 文档

> 高性能多协议代理后端，支持 VMess、VLESS、Trojan、SS、SSR、Hysteria2、TUIC、AnyTLS、Naive、Mieru

## 快速开始

[安装与配置](heki/heki-config.md) | [Docker 部署](docker/docker-tutorial.md)

> 当前稳定版：`v1.2.6`；Docker 推荐标签：`hekicore/heki:latest`；最近更新：`2026-09-06`

## v1.2.6 更新摘要

- 升级 GOST、Hysteria2、sing、sing-quic、AnyTLS、VMess 和 Mieru 上游依赖，并保留必要的本地协议兼容补丁
- TUIC 新增 QUIC 流控窗口、0-RTT、认证超时、心跳和空闲超时运行参数
- AnyTLS 修复 session 复用、重连和 session 版本字段问题；VMess 修复空写入产生异常数据帧的问题
- Mieru 接入低熵流量模式、用户发现缓存和可选的 user hint 强制校验
- 完成全协议连通性、配置文档、race 和 8000 用户 soak 验证

## 🎉 免费版

不配置 `heki_key` 即可使用免费版，最多 88 个有效用户，全部协议和功能，永久免费。

详细说明：[免费版文档](heki/free-edition.md) | 超过 88 人？[购买授权](buy/get-license-code.md)

---

## 功能介绍

### heki 后端特点

| 维度 | 说明 |
|---|---|
| 架构 | 独立后端，不基于任何 core |
| 协议 | `VMess / VLESS / Trojan / SS / SSR / Hysteria2 / TUIC / AnyTLS / Naive / Mieru` |
| 扩展 | `Reality / Vision / ShadowTLS / SS 插件链路` 已接入真实运行时 |
| 性能 | 多层内存优化，支持 `GOGC / GOMEMLIMIT` |
| 部署 | 一键安装、Docker 友好、多实例、`HTTP / DNS / 自签` 证书 |
| 多节点 | 单实例混合协议，`[USER]` 独立配置，多路由、多出口 |
| 安全 | 密码攻击防护、`VMess AEAD + 防重放`、panic recovery、离线授权 |
| 可观测性 | 本地 JSONL 域名审计、ClickHouse 全量访问日志、分级日志与 pprof |
| 内置 | `Shadow TLS`、`Obfs HTTP/TLS / V2Ray WS / Gost / KCPTun`、`heki-v1`、Redis 限制 |
| 验证 | 单测、集成、联调、soak 压测覆盖 |
| 免费版 | 88 用户，全部协议和功能，无需联网验证 |

---

## 功能列表

> 以下为 Heki 整体能力总览，部分功能仅对特定协议或场景生效，具体以表中说明和对应协议文档为准。

| 功能 | 支持 |
|---|---|
| 单端口多用户 | ✅ |
| 单实例多节点 + 混合协议 | ✅ |
| 节点独立配置（[USER] 区覆盖参数） | ✅ |
| `xhttp / splithttp` 入站（`VMess / VLESS / Trojan / AnyTLS`） | ✅ |
| `Reality / Vision`（`VLESS`） | ✅ |
| 多层内存优化 + `GOGC / GOMEMLIMIT` 调优 | ✅ |
| 用户限制与在线约束（网速 / TCP 连接 / IP / 设备） | ✅（`IP/设备` 支持多协议统一生效，可搭配 Redis 跨节点共享） |
| 规则与路由（审计 / 白名单 / 多出口 / `routes/custom_outbounds/custom_routes`） | ✅ |
| TLS / Shadow TLS（`HTTP / DNS / 自签` 证书，内置 `Shadow TLS v1/v2/v3`） | ✅ |
| SS 插件内置（Obfs / V2Ray WS / Gost / KCPTun） | ✅ |
| DNS / 域名嗅探（`TLS / HTTP / QUIC`） | ✅ |
| 网络增强（源进源出 / MPTCP / Proxy Protocol / UDP FullCone） | ✅ |
| Docker 环境变量覆盖（含 `proxy_protocol` / `udp_proxy_protocol` / `force_proxy_protocol`） | ✅ |
| 面板高级字段直达运行时（`xhttp / AnyTLS / TUIC / Mieru`） | ✅ |
| 安全与稳态（攻击防护 / `VMess AEAD + 防重放` / panic recovery） | ✅ |
| 控制面稳态（API 指数退避 / 授权离线容灾） | ✅ |
| 公共控制面 WebAPI（`heki-v1`） | ✅ |
| 日志轮转 + 环境变量覆盖 | ✅ |

> Gost 当前内置覆盖 `websocket / wss / mws / mwss / http2 / h2c / grpc / tls / mtls / kcp / pht / phts / quic` 子集。像 `mux`、`fingerprint`、`insecure`、`fast-open` 这类客户端侧参数不需要 heki 服务端额外实现。

## 常用功能文档

- [多路由多出口负载均衡](other/routes-config.md)（含 XBoard / XiaoV2Board 面板运行时路由格式支持说明）
- [多节点 & 多实例部署](other/heki-multi-instance.md)
- [多 IP 自动选择出口（源进源出）](other/auto-out-ip.md)
- [DNS 解析配置](other/dns-config.md)
- [审计规则 / 白名单 / 黑名单](other/block-list-config.md)
- [内存与 pprof 排查](other/memory-troubleshooting.md)

---

## 支持的面板

`heki-v1` 为 heki 对外公开的版本化 WebAPI。接入说明见 [heki-v1 WebAPI 开发文档](panel/heki-v1-webapi.md) 和 [heki-v1 参考后端与联调](panel/heki-v1-example-server.md)。

| 面板 | v2ray | trojan | ss | ssr | vless | hysteria | tuic | anytls | naive | mieru |
|---|---|---|---|---|---|---|---|---|---|---|
| xboard | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| xiaov2board | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| metron | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| sspanel-uim | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| v2board | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| ppanel | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| heki-v1 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 各协议支持详情

### v2ray（VMess）

| 协议 | 传输方式 |
|---|---|
| VMess | `tcp`, `tcp+tls`, `ws`, `ws+tls`, `httpupgrade`, `httpupgrade+tls`, `h2c`, `h2+tls`, `grpc`, `grpc+tls`, `xhttp/splithttp` |
| VMessAEAD | `tcp`, `tcp+tls`, `ws`, `ws+tls`, `httpupgrade`, `httpupgrade+tls`, `h2c`, `h2+tls`, `grpc`, `grpc+tls`, `xhttp/splithttp` |

默认会先兼容 `VMessAEAD` 和 `VMessMD5`；但只要面板/订阅下发里明确保留 `alterId>0`，heki 就会自动锁到 `VMessMD5-only`，避免 `AEAD/MD5` 混跑。若希望客户端稳定走 `VMessAEAD`，建议在订阅下发中直接删除 `alterId` 字段，不要仅写 `alterId=0`。

### Trojan

| 协议 | 传输方式 |
|---|---|
| Trojan | `tcp`, `tcp+tls`, `ws`, `ws+tls`, `httpupgrade`, `httpupgrade+tls`, `h2c`, `h2+tls`, `grpc`, `grpc+tls`, `xhttp/splithttp` |

### Shadowsocks（密码单端口）

| 加密 | 混淆 |
|---|---|
| chacha20-ietf-poly1305 | simple_obfs_http |
| aes-128-gcm | |
| aes-192-gcm | |
| aes-256-gcm | |
| rabbit128-poly1305 | |
| aegis-128l | |
| aegis-256 | |
| aez-384 | |
| deoxys-ii-256-128 | |
| ascon128 | |
| ascon128a | |
| 2022-blake3-aes-128-gcm | |
| 2022-blake3-aes-256-gcm | |
| 2022-blake3-chacha20-poly1305 | |

### ShadowsocksR（协议单端口 / 混淆单端口）

| 加密 | 协议 | 混淆 |
|---|---|---|
| none | origin | plain |
| rc4 | auth_aes128_md5 | http_simple |
| rc4-md5 | auth_aes128_sha1 | http_post |
| aes-128-cfb | auth_chain_a | tls1.2_ticket_auth / tls1.2_ticket_fastauth |
| aes-192-cfb | auth_chain_b | simple_obfs_http |
| aes-256-cfb | auth_chain_c | simple_obfs_tls |
| aes-128-ctr | auth_chain_d | |
| aes-192-ctr | auth_chain_e | |
| aes-256-ctr | auth_chain_f | |
| aes-128-ofb | | |
| aes-192-ofb | | |
| aes-256-ofb | | |
| chacha20 | | |
| chacha20-ietf | | |
| salsa20 | | |
| aes-128-gcm | | |
| aes-192-gcm | | |
| aes-256-gcm | | |
| chacha20-ietf-poly1305 | | |

### VLESS

| 协议 | 传输方式 |
|---|---|
| VLESS | `reality (xtls-rprx-vision)`, `tcp`, `tcp+tls`, `ws`, `ws+tls`, `httpupgrade`, `httpupgrade+tls`, `h2c`, `h2+tls`, `grpc`, `grpc+tls`, `xhttp/splithttp` |

### Hysteria2

| 协议 | 说明 |
|---|---|
| Hysteria v2 | QUIC + 密码认证 |

### TUIC

| 协议 | 说明 |
|---|---|
| TUIC v5 | QUIC + UUID 认证，支持 `zero_rtt_handshake`、`auth_timeout`、`heartbeat`、`ECH keyset` 与 `bbr/cubic/new_reno`；heki 默认 `cubic`，面板或本地显式下发时按下发值生效，未显式配置时会写入 `2 / 6 / 3 / 15 MB` 的流/连接窗口 |

### AnyTLS

| 协议 | 说明 |
|---|---|
| AnyTLS v1+v2 | 支持 `TLS / Reality` 下的 `tcp / ws / httpupgrade / h2 / grpc / xhttp / splithttp`，并支持 `paddingScheme` 与 UDP（UoT） |

### Naive

| 协议 | 说明 |
|---|---|
| Naive | HTTP/2 CONNECT + Basic Auth over TLS |

### Mieru

| 协议 | 说明 |
|---|---|
| Mieru | TCP / UDP（XChaCha20-Poly1305 加密），支持 `traffic_pattern` 与 `user hint` 强制校验；`multiplexing` 仅作为客户端侧偏好保留，不改变当前 heki 服务端行为 |

> Mieru 会基于用户名、密码和系统时间派生密钥。请确保客户端与服务端时间同步正常，推荐保持秒级误差；按上游协议文档，时间差理论上不应超过约 4 分钟。
> Mieru 直连目标侧失败（如目标 DNS 不存在、目标端口拒绝、IPv6 直连被系统拒绝）默认不输出 warning，避免客户端本机协议和系统探测流量刷屏；route/block/非 direct 出站失败仍会输出结构化 warning。
