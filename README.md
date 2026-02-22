# 功能介绍

> heki 后端同时支持 vmess、trojan、ss、ssr、vless、hysteria、anytls 协议，支持多个面板对接，功能丰富

## heki 后端特点

- 专为面板对接打造，`全新实现`每个协议（**heki 是完全重写的独立内核，不基于任何 core**），`极致优化`内存和 CPU 性能
- 一键安装，配置简单明了
- 所有协议均实现 UDP FullCone
- 自动从面板获取协议类型，无需手动配置 `server_type`
- 自动检测面板类型，默认 `sspanel-uim`
- 开源项目，代码透明可审计

---

# 性能对比

> heki 使用 Go 语言全新实现所有协议，在内存、CPU、安全性等多个维度进行了深度优化

## 核心性能对比

| 对比项 | heki | soga | v2ray-core / xray-core |
|-------|------|------|----------------------|
| 内核实现 | Go 全新独立实现 | Go 全新独立实现 | 原版内核 |
| 单连接内存 | ~28KB | ~32KB | ~44-64KB |
| 1000 连接内存 | ~28MB | ~32MB | ~44-64MB |
| 数据转发内存分配 | 接近零分配 | 低分配 | 每次分配 |
| SS2022 用户匹配 | O(1) 查表 | O(N) 遍历 | O(N) 遍历 |
| VMessAEAD 用户匹配 | O(1) IP 缓存 | O(1) IP 缓存 | O(N) 遍历 |
| VLESS/Trojan 用户匹配 | O(1) 哈希表 | O(1) 哈希表 | O(1) 哈希表 |
| VMess AuthenticatedLength | ✅ | ✅ | ✅ |
| VMess SessionHistory 防重放 | ✅ | ❌ | ✅ |
| TLS 握手超时保护 | ✅ | ❌ | ❌ |
| DNS 查询合并 | ✅ | ❌ | ❌ |
| 配置参数启动校验 | ✅ | ❌ | ❌ |
| IP 缓存原子写入 | ✅ | ❌ | ❌ |
| panic 完整堆栈日志 | ✅ | ❌ | ❌ |
| WebSocket mask 批量优化 | ✅ | ❌ | ❌ |
| UDP NAT 表单任务清理 | ✅ | ❌ | 每会话独立任务 |
| 用户级限速 (多连接共享) | ✅ 三层叠加 | ✅ | ❌ |
| API 指数退避重试 | ✅ 智能分级 | ✅ | ❌ |
| 错误密码攻击防护 | ✅ | ✅ | ❌ |

## 功能对比

| 功能 | heki | soga |
|------|------|------|
| 支持协议 | VMess/VLESS/Trojan/SS/SSR/Hysteria2/AnyTLS | VMess/VLESS/Trojan/SS/SSR/Hysteria2/AnyTLS |
| 面板支持 | SSPanel/V2Board/XBoard | SSPanel/V2Board/XBoard/WHMCS/ProxyPanel/PPanel |
| UDP FullCone | ✅ 全协议 | ✅ 全协议 |
| 动态限速 | ✅ | ✅ |
| 全局 IP/设备限制 (Redis) | ✅ | ✅ |
| 自动证书申请 (ACME) | ✅ | ✅ |
| 多路由负载均衡 | ✅ | ✅ |
| 单实例多节点 | ✅ | ✅ |
| 源进源出 | ✅ | ✅ |
| 自定义 WebAPI | ❌ | ✅ (soga-v1) |
| Docker 多架构 | ✅ amd64+arm64 | ✅ amd64+arm64 |

---

# 功能列表

!> 所有后端类型均支持以下功能

| 功能                                  | 支持情况         |
|-------------------------------------|--------------|
| 极致优化性能和内存占用                         | ✅            |
| 面板对接 api 信息自动上报与加载                  | ✅            |
| 单端口多用户                              | ✅            |
| 限制用户网速 (固定限速+动态限速)                  | ✅            |
| 限制用户 tcp 连接数                        | ✅            |
| 全局限制用户 IP 数 (搭配redis)               | ✅            |
| 全局限制用户设备数 (搭配redis)                 | ✅(仅ssr协议单端口) |
| 审计规则、白名单规则 (可远程加载配置)                | ✅            |
| 自动申请、续签 tls证书                       | ✅            |
| dns 解析配置                            | ✅            |
| 代理出站负载均衡 (可远程加配置)                   | ✅            |
| 单实例多节点对接                            | ✅            |
| 多 ip 机器自动选择出口 ip (源进源出)             | ✅            |
| proxy protocol 获取真实用户 IP            | ✅            |
| 协议设计性能优化 (ss aead 密码单端口+VMess AEAD) | ✅            |
| 错误密码攻击优化 (ss aead 密码单端口+VMess AEAD) | ✅            |
| VMess AuthenticatedLength 安全增强      | ✅            |
| VMess SessionHistory 防重放             | ✅            |
| panic recovery 连接级故障隔离              | ✅            |
| API 指数退避重试                          | ✅            |
| 更多功能...                             | ✅            |

## 支持的面板

| 面板            | v2ray | trojan | ss        | ssr            | vless | hysteria | anytls |
|---------------|-------|--------|-----------|----------------|-------|----------|--------|
| xiaov2board   | ✅     | ✅      | ✅(密码单端口)  | ❌              | ✅     | ✅        | ✅      |
| xboard        | ✅     | ✅      | ✅(密码单端口)  | ❌              | ✅     | ✅        | ✅      |
| sspanel-uim   | ✅     | ✅      | ✅(密码单端口)  | ✅(混淆+协议单端、多端口) | ❌     | ❌        | ❌      |
| v2board       | ✅     | ✅      | ✅(密码单端口)  | ❌              | ❌     | ❌        | ❌      |

## v2ray 后端类型支持的协议

| 协议        | 支持情况                                                           |
|-----------|----------------------------------------------------------------|
| VMess     | `tcp`,`tcp+tls`,`ws`,`ws+tls`,`h2c`,`h2+tls`,`grpc`,`grpc+tls` |
| VMessAEAD | `tcp`,`tcp+tls`,`ws`,`ws+tls`,`h2c`,`h2+tls`,`grpc`,`grpc+tls` |

## trojan 后端类型支持的协议

| 协议     | 支持情况                                            |
|--------|-------------------------------------------------|
| trojan | `tcp`,`tcp+tls`,`ws`,`ws+tls`,`grpc`,`grpc+tls` |

## ss 后端类型支持的加密 (密码单端口)

| 加密                      | 混淆               |
|-------------------------|------------------|
| chacha20-ietf-poly1305  | simple_obfs_http |
| aes-128-gcm             |                  |
| aes-192-gcm             |                  |
| aes-256-gcm             |                  |
| -                       |                  |
| 2022-blake3-aes-128-gcm |                  |
| 2022-blake3-aes-256-gcm |                  |

## ssr 后端类型支持的加密 (协议单端口或混淆单端口)

> 混淆+协议单端口支持以下加密、协议、混淆

| 加密                     | 协议               | 混淆                 |
|------------------------|------------------|--------------------|
| none                   | origin           | plain              |
| rc4                    | auth_aes128_md5  | http_simple        |
| rc4-md5                | auth_aes128_sha1 | http_post          |
| aes-128-cfb            | auth_chain_a     | tls1.2_ticket_auth |
| aes-192-cfb            | auth_chain_b     | simple_obfs_http   |
| aes-256-cfb            | auth_chain_c     | simple_obfs_tls    |
| aes-128-ctr            | auth_chain_d     |                    |
| aes-192-ctr            | auth_chain_e     |                    |
| aes-256-ctr            | auth_chain_f     |                    |
| aes-128-ofb            |                  |                    |
| aes-192-ofb            |                  |                    |
| aes-256-ofb            |                  |                    |
| chacha20               |                  |                    |
| chacha20-ietf          |                  |                    |
| salsa20                |                  |                    |
| aes-128-gcm            |                  |                    |
| aes-192-gcm            |                  |                    |
| aes-256-gcm            |                  |                    |
| chacha20-ietf-poly1305 |                  |                    |

## vless 后端类型支持的协议
| 协议        | 支持情况                                                                                        |
|-----------|---------------------------------------------------------------------------------------------|
| vless     | `reality (xtls-rprx-vision)`,`tcp`,`tcp+tls`,`ws`,`ws+tls`,`h2c`,`h2+tls`,`grpc`,`grpc+tls` |

## hysteria 后端类型支持的协议
| 协议          | 支持情况 |
|-------------|------|
| hysteria v2 | ✅    |

## anytls 后端类型支持的协议
| 协议                   | 支持情况 |
|----------------------|------|
| anytls v1+v2         | ✅    |
| anytls paddingScheme | ✅    |
