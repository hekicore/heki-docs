# Xboard 对接 Shadowsocks

> 使用 ss 密码单端口必看: [ss 密码单端口优化](other/ss-aead.md)

## 第一步，在面板添加一个 SS 节点

在 Xboard 后台添加 Shadowsocks 节点，选择加密算法。

如果下拉框里没有目标 cipher，可以在「加密算法」里直接输入自定义名称。XBoard 会把该字符串作为 `cipher` 原样下发给 heki；普通 SS AEAD（例如 `rabbit128-poly1305`、`aez-384`、`deoxys-ii-256-128`、`aegis-256`、`lea-256-gcm`、`ascon128`、`ascon128a`）不需要改 XBoard 源码。客户端订阅端也必须支持同名 cipher，推荐用 mihomo / Clash.Meta 类客户端验证。

如需使用插件，在「插件」下拉框选择对应插件类型，并在「插件选项」中按 `key=value;key2=value2` 格式填写参数。

> 先区分两件事：
> - `XBoard -> heki` 节点配置下发：UniProxy API 已会返回 `plugin` / `plugin_opts`
> - `XBoard -> 客户端` 订阅下发：不同订阅模板对 SS 插件的支持不完全一致
> - 如果你要给客户端稳定下发插件配置，建议继续阅读本文后半部分的「订阅兼容提醒」和单独的排障文档：[XBoard SS 插件订阅修复说明](ss/xboard-ss-subscription-fix.md)

## 第二步，配置 heki

```ini
type=xboard
server_type=ss
panel_url=https://your-xboard.com
panel_key=your-key
node_id=1
```

参考: [heki 详细配置项](heki/heki-config.md)

## 第三步，启动 heki

```
heki start
```

若出现启动失败的情况，使用 `heki log` 查看错误信息

---

## SS 插件配置说明

按当前 heki 已适配的 XBoard SS 插件链路，面板里常见的插件主要有以下 6 类，下面给出对应填写方式。

!> **插件选项格式必须严格按照下方示例填写**，格式错误会导致客户端无法连接。

### 1. Simple Obfs

HTTP / TLS 混淆，heki 均已内置支持，无需外部 simple-obfs 进程。

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `Simple Obfs` |
| 插件选项 | `obfs=http;obfs-host=www.bing.com` |

TLS 混淆模式：

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `Simple Obfs` |
| 插件选项 | `obfs=tls;obfs-host=www.bing.com` |

!> Simple Obfs TLS 模式同样由 heki 内置处理；客户端订阅需要正确下发 `obfs=tls` 和 `obfs-host`。

`v1.2.6` 升级了 SS 相关底层依赖及协议兼容链路；既有 SS/SS2022 加密、nonce、chunk 和插件 on-wire 语义保持兼容，并通过全协议连通性回归。上一版 `v1.2.5` 的 Simple Obfs HTTP/TLS 握手阻塞修复也继续保留。

`v1.2.5` 在 2026-09-04 同版本重发，修复了未完成的 HTTP/TLS obfs 握手阻塞同监听器后续连接的问题。这个问题发生在 SS 解密前，因此会表现为任意 SS 加密算法加 obfs 后偶发批量超时。更新后每条 obfs 握手独立处理，无需在面板或客户端增加额外参数；HTTP/TLS 已通过真实 Mihomo 兼容回归。


### 2. V2Ray Plugin

WebSocket 传输，heki 内置支持 websocket 模式。

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `V2Ray Plugin` |
| 插件选项 | `mode=websocket;host=www.bing.com;path=/` |

启用 TLS（wss）：

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `V2Ray Plugin` |
| 插件选项 | `mode=websocket;tls=true;host=www.bing.com;path=/` |

> heki 服务端同时兼容 `tls` 和 `tls=true` 两种写法。
> 但如果你依赖 XBoard 的多种客户端订阅模板，建议统一写成 `tls=true`。`Clash / Stash` 只稳定保留 `key=value`；`Clash.Meta` 虽能保留裸 `tls`，统一写显式值仍最省事。

!> V2Ray Plugin QUIC 模式需要外部进程，heki 不内置支持。

### 3. Shadow TLS（服务端内置，无需额外部署）

伪装 TLS 握手。heki 内置了 Shadow TLS v1/v2/v3 服务端，服务器上只需要运行 heki，不需要额外部署 shadow-tls 进程。

客户端仍然需要支持 Shadow TLS（如 Clash.Meta、sing-box 等），不支持的客户端无法连接。

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `Shadow TLS` |
| 插件选项 | `host=www.microsoft.com;password=your_password;version=3` |

参数说明：
- `host` — 握手服务器域名，Shadow TLS 会连接该域名完成真实 TLS 握手（需要是可访问的 TLS 服务器）
- `password` — v1 不使用密码；v2/v3 必须填写并与客户端保持一致
- `version` — 协议版本，支持 `1`/`2`/`3`，推荐 `3`

Xiao / V2Board 的 v2node 接口如果下发 `obfs=shadow-tls` 或 `obfs=shadow_tls`，heki 也会自动映射到内置 Shadow TLS。`obfs_password` 会作为 Shadow TLS 密码；握手域名可来自 `shadow_tls_server`、`shadow_tls_host`、`obfs_settings.host`、`network_settings.Host` 或 `network_settings.headers.Host`。只下发这些字段时，heki 会自动补齐兼容运行时和订阅所需的 `plugin_opts=host=...;password=...;version=...`；未显式填写版本时默认使用 `3`。

`v1.2.2` 同版本重发后，这条兼容口径已经和 release notes、Docker 文档、公开 README 对齐：只要面板字段仍是上述几种 Shadow-TLS 组合，heki 运行时不会要求额外新增配置开关；同一轮发布里 SS / SS2022 的 TCP IP cache 也恢复成“同 IP 只保留最近一次成功用户”的单候选语义，不会因为同 IP 高频切换多个用户而累积候选列表。2026-07-16 重发继续修复用户/节点双限速在同一条连接上的重复等待，以及 `aegis-128l + simple_obfs_http/tls` 长流偶发断流；这些调整仍不改变 SS / SS2022 的加密、nonce、chunk、UDP session 或 relay 格式。

#### 工作原理

Shadow TLS 不需要域名和证书。它借用真实 TLS 服务器（如 `www.microsoft.com`）的握手过程来伪装流量：

1. 客户端连接 heki 监听端口
2. heki 内置的 Shadow TLS 服务端与客户端进行伪装握手（同时连接 `host` 指定的真实 TLS 服务器获取真实的 ServerHello/Certificate）
3. 握手完成后，Shadow TLS 层解包，内层 SS 流量交给 SS handler 处理

#### 客户端配置示例

Clash.Meta / mihomo：
```yaml
- name: "ss-shadow-tls"
  type: ss
  server: your-server-ip
  port: 49281
  cipher: 2022-blake3-aes-256-gcm
  password: "your-ss-password"
  plugin: shadow-tls
  plugin-opts:
    host: "www.microsoft.com"
    password: "your_password"
    version: 3
```

sing-box：
```json
{
  "type": "shadowsocks",
  "tag": "ss-shadow-tls",
  "server": "your-server-ip",
  "server_port": 49281,
  "method": "2022-blake3-aes-256-gcm",
  "password": "your-ss-password",
  "detour": "shadow-tls-out",
  "udp_over_tcp": true
}
```
```json
{
  "type": "shadowtls",
  "tag": "shadow-tls-out",
  "server": "your-server-ip",
  "server_port": 49281,
  "version": 3,
  "password": "your_password",
  "tls": {
    "enabled": true,
    "server_name": "www.microsoft.com"
  }
}
```

#### 日志确认

启动后日志中应出现：
```
Shadow-TLS v3 enabled (handshake=www.microsoft.com:443)
Shadow-TLS v3 built-in enabled (handshake=www.microsoft.com:443)
```

非 Shadow TLS 客户端连接时会出现以下 WARN，属于正常行为（拒绝了非法连接）：
```
[WARN] shadow-tls: [client hello verify failed: unexpected record type]
```

### 4. ResTLS（外部进程）

类似 Shadow TLS 的 TLS 伪装方案。ResTLS 服务端只有 Rust 实现，heki 不内置支持，需要部署外部 `restls` 进程。

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `ResTLS` |
| 插件选项 | `host=www.microsoft.com;password=your_password;version-hint=tls13;restls-script=300?100<1,400~100,350~100,600~100` |

参数说明：
- `host` — 伪装的 TLS 目标域名（TLS 1.3 服务器）
- `password` — ResTLS 认证密码
- `version-hint` — TLS 版本提示，填 `tls13` 或 `tls12`
- `restls-script` — 流量行为控制脚本，用于隐藏代理特征

#### 服务端部署

从 [restls releases](https://github.com/3andne/restls/releases) 下载对应平台的二进制。

1. 配置 heki 监听本地端口（如 `127.0.0.1:8388`），在配置文件中设置：
```ini
listen=127.0.0.1
```

2. 启动 restls 进程，监听公网端口，转发到 heki：
```bash
restls -s "www.microsoft.com" \
  -l "0.0.0.0:49281" \
  -p "your_password" \
  -f "127.0.0.1:8388" \
  --script "300?100<1,400~100,350~100,600~100,600~100,100~1200"
```

参数对应：
- `-s` — 对应面板 `host` 参数
- `-l` — restls 监听地址（公网端口，即面板配置的端口）
- `-p` — 对应面板 `password` 参数
- `-f` — 转发目标，指向 heki 的 SS 监听地址
- `--script` — 对应面板 `restls-script` 参数

流量路径：`客户端 → restls(:49281) → heki(:8388) → 目标网站`

#### 用 systemd 管理 restls

```ini
[Unit]
Description=Restls Server
After=network.target

[Service]
ExecStart=/usr/local/bin/restls \
  -s "www.microsoft.com" \
  -l "0.0.0.0:49281" \
  -p "your_password" \
  -f "127.0.0.1:8388" \
  --script "300?100<1,400~100,350~100,600~100,600~100,100~1200"
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable restls
sudo systemctl start restls
```

### 5. Gost Plugin

Gost Plugin 当前内置支持 `websocket` / `wss` / `mws` / `mwss` / `http2` / `h2c` / `grpc` / `tls` / `mtls` / `kcp` / `pht` / `phts` / `quic` 子集，无需额外部署 gost 服务端进程。

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `Gost Plugin` |
| 插件选项 | `mode=websocket;host=www.bing.com;path=/` |

启用 TLS（wss）：

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `Gost Plugin` |
| 插件选项 | `mode=websocket;tls=true;host=www.bing.com;path=/` |

Multiplex WebSocket（mws）：

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `Gost Plugin` |
| 插件选项 | `mode=mws;host=www.bing.com;path=/mux` |

Multiplex WebSocket over TLS（mwss）：

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `Gost Plugin` |
| 插件选项 | `mode=mwss;host=www.bing.com;path=/mux` |

HTTP/2（TLS）：

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `Gost Plugin` |
| 插件选项 | `mode=http2;host=www.bing.com;path=/h2` |

H2C（明文 HTTP/2）：

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `Gost Plugin` |
| 插件选项 | `mode=h2c;host=www.bing.com;path=/h2` |

原生 TLS：

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `Gost Plugin` |
| 插件选项 | `mode=tls;host=www.bing.com` |

Multiplex TLS（mtls）：

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `Gost Plugin` |
| 插件选项 | `mode=mtls;host=www.bing.com` |

gRPC（gun）：

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `Gost Plugin` |
| 插件选项 | `mode=grpc;serviceName=GunService` |

参数说明：
- `serviceName` — gRPC service 名称，默认 `GunService`
- `grpc.serviceName` — 与 `serviceName` 等价，推荐在需要和其他 `gost` 参数族区分时使用

PHT（Plain HTTP Tunnel）：

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `Gost Plugin` |
| 插件选项 | `mode=pht;host=www.bing.com` |

PHTS（PHT over TLS）：

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `Gost Plugin` |
| 插件选项 | `mode=phts;host=www.bing.com` |

PHT / PHTS 额外可选参数：
- `pht.authorizePath` / `authorizePath` — 授权端点，默认 `/authorize`
- `pht.pushPath` / `pushPath` — 上行推送端点，默认 `/push`
- `pht.pullPath` / `pullPath` — 下行拉取端点，默认 `/pull`
- `pht.backlog` / `backlog` — 待处理连接队列长度，默认 `128`
- `pht.readBufferSize` / `readBufferSize` — 单次读取缓冲区大小，默认 `32768`
- `pht.readTimeout` / `readTimeout` — pull 长轮询读取超时，默认 `10s`

KCP：

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `Gost Plugin` |
| 插件选项 | `mode=kcp;kcp.key=your_secret;kcp.crypt=aes;kcp.mode=fast` |

QUIC：

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `Gost Plugin` |
| 插件选项 | `mode=quic;host=your.domain.com` |

如需开启 GOST QUIC 的包级额外加密，可继续追加：

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `Gost Plugin` |
| 插件选项 | `mode=quic;host=your.domain.com;quic.key=abcdefghijklmnop` |

QUIC 额外可选参数：
- `quic.key` / `quic.cipherKey` — 包级额外加密密钥
- `quic.ttl` / `ttl` — KeepAlive 周期，例如 `15s`
- `quic.keepAlive` / `keepAlive` — 是否启用 KeepAlive，默认跟随 `quic.ttl`
- `quic.handshakeTimeout` / `handshakeTimeout` / `timeout` — 握手超时
- `quic.maxIdleTimeout` / `maxIdleTimeout` / `idleTimeout` / `idle` — 空闲超时
- `quic.maxStreams` / `maxStreams` — 单连接最大入站流数量
- `quic.enableDatagram` / `enableDatagram` — 是否启用 QUIC datagram

也兼容 `mode=ws` / `mode=wss` / `mode=h2` / `mode=http2c` / `mode=gun` 这类别名写法。

> 内置 gost 覆盖 `mode=websocket`、`wss`、`mws`、`mwss`、`http2`、`h2c`、`grpc`、`tls`、`mtls`、`kcp`、`pht`、`phts`、`quic`；其他 gost 模式仍需外部进程。`mode=quic` 需要可用 TLS 证书，并会占用该节点的 UDP 端口。像 `mux`、`fingerprint`、`insecure`、`fast-open` 这类客户端侧参数不需要 heki 服务端额外实现。

工作方式：
- `客户端 → heki(ws/wss) → SS handler → 目标网站`
- `客户端 → heki(mws/mwss + smux) → SS handler → 目标网站`
- `客户端 → heki(http2/h2c) → SS handler → 目标网站`
- `客户端 → heki(grpc gun) → SS handler → 目标网站`
- `客户端 → heki(tls) → SS handler → 目标网站`
- `客户端 → heki(mtls + smux) → SS handler → 目标网站`
- `客户端 → heki(kcp+smux) → SS handler → 目标网站`
- `客户端 → heki(pht/phts) → SS handler → 目标网站`
- `客户端 → heki(quic streams) → SS handler → 目标网站`

!> `http2` 与 `tls` 模式都需要证书；`h2c` 为明文 HTTP/2，不需要证书。
!> `phts` 需要证书；`pht` 为明文 HTTP 隧道，不需要证书。
> `kcp` 模式底层行为与 `kcptun` 常用参数族一致；`kcp.tcp=true` 仅 Linux 可用，且需要 raw socket / iptables 相关权限。

### 6. KCPTun

KCPTun 现已内置支持常用 KCP 传输参数，无需额外部署 `kcptun-server`。`tcp=true` 伪装模式也已支持，但仅 Linux 可用，且需要 raw socket / iptables 相关权限。

| 面板字段 | 填写内容 |
|---------|---------|
| 插件 | `KCPTun` |
| 插件选项 | `key=your_secret;crypt=aes;mode=fast` |

参数说明：
- `key` — 预共享密钥
- `crypt` — 加密方式：aes, aes-128, aes-128-gcm, salsa20, blowfish, twofish, cast5, 3des, tea, xtea, xor, none, null
- `mode` — 速度模式：fast3, fast2, fast, normal
- `nocomp` — 可选，无值参数，出现时表示关闭 snappy 压缩
- `acknodelay` / `tcp` — 布尔开关，建议写成 `acknodelay=true`、`tcp=true`
- `mtu` / `sndwnd` / `rcvwnd` / `datashard` / `parityshard` / `dscp` / `nodelay` / `interval` / `resend` / `nc` / `sockbuf` / `smuxbuf` / `framesize` / `streambuf` / `smuxver` / `keepalive` 等高级参数也会透传给内置 kcptun

工作方式：`客户端 → heki(kcptun/kcp+smux) → SS handler → 目标网站`

!> `tcp=true` 为 Linux 专属能力。若当前环境没有 raw socket / iptables 权限，heki 会回退为外部进程方案提示。

!> 使用内置 kcptun 时，节点监听的 UDP 端口会被 kcptun 占用，因此 SS 原生 UDP relay 会自动关闭。

其他可选参数：`mtu=1350;sndwnd=128;rcvwnd=512;datashard=10;parityshard=3;nocomp`

#### 兼容说明

如果你在非 Linux 环境，或当前环境缺少 raw socket / iptables 权限，仍可继续按旧方案部署外部 `kcptun-server`，再把解包后的 SS 流量转发给 heki。

---

## 插件支持一览

| 插件 | heki 内置 | 需要外部进程 | 备注 |
|------|----------|------------|------|
| Simple Obfs (HTTP) | ✅ | 否 | 推荐 |
| Simple Obfs (TLS) | ✅ | 否 | 客户端需正确下发 `obfs=tls` |
| V2Ray Plugin (WS) | ✅ | 否 | 推荐 |
| V2Ray Plugin (WS+TLS) | ✅ | 否 | 需要证书 |
| V2Ray Plugin (QUIC) | ❌ | 是 | |
| Shadow TLS v1/v2/v3 | ✅ | 否 | 服务端内置，客户端需支持 |
| ResTLS | ❌ | 是 | 需部署 restls 进程 |
| Gost Plugin (WS/WSS/MWS/MWSS/HTTP2/H2C/GRPC/TLS/MTLS/KCP/PHT/PHTS/QUIC) | ✅ | 否 | 仅少数未覆盖的 gost 模式仍需外部进程 |
| KCPTun | ✅ | 否 | `tcp=true` 仅 Linux 且需 raw socket / iptables 权限 |

---

## 订阅兼容提醒

`Xboard -> heki` 这一段，面板已经能把 `plugin` / `plugin_opts` 正常返回给 heki；`server_key` 当前覆盖 `2022-blake3-aes-128-gcm` 和 `2022-blake3-aes-256-gcm`，但 `2022-blake3-chacha20-poly1305` 仍需面板侧补齐。这一点和客户端订阅是否正确下发是两回事。

客户端订阅层需要特别注意：

- `flag=shadowsocks` 走的是 `Xboard/app/Protocols/Shadowsocks.php` 的 SIP008 输出。
- 这条输出目前**没有**携带 `plugin` / `plugin_opts`，而且 `handle()` 里只放行了少数传统 AEAD cipher，**没有放行 SS2022**。
- `flag=general` / `flag=sagernet` / `flag=v2rayn` / `flag=v2rayng` / `flag=passwall` / `flag=ssrplus`、`flag=shadowrocket`、`flag=sing-box` 这一类格式对 SS 插件和 `gost` 最友好，因为它们会直接透传原始 `plugin_opts`。
- `flag=meta` 比 `clash` / `stash` 更完整：它会把无值 flag 保留成 `true`，可以作为次优方案。
- `flag=clash` / `flag=stash` 会二次解析 `plugin_opts`，并且只稳定保留 `key=value` 形式的参数，像裸 `tls`、`nocomp` 这类 flag 容易被吃掉。
- `flag=surge` / `flag=loon` / `flag=quantumultx` / `flag=surfboard` 当前主要只照顾 `obfs`，不适合作为“heki 已适配的全部 gost 模式”的主订阅格式。

因此，如果你要依赖面板订阅给客户端下发 SS 插件，建议优先按下面的规则填写：

- 布尔开关统一写成 `=true`：例如 `tls=true`、`nocomp=true`、`acknodelay=true`、`tcp=true`、`kcp.nocomp=true`、`kcp.tcp=true`。
- 如需 Simple Obfs 路径参数，优先明确写 `path=/xxx`；若你还要兼容只认原始 simple-obfs 参数的客户端，可以同时保留 `obfs-uri=/xxx`。
- 如果你用的是原始 SS / SIP008 订阅，不要指望它稳定下发 SS 插件或 SS2022；这种场景建议改用 `flag=general` / `sagernet` / `shadowrocket` / `sing-box` / `meta` 等格式。

更完整的模板分级、代码位置和修复建议见：[XBoard SS 插件订阅修复说明](ss/xboard-ss-subscription-fix.md)。

---

## 常见问题

### 插件选项格式错误

**错误示例**（Simple Obfs 填了 v2ray-plugin 的格式）：
```
mode=websocket;host=www.bing.com;path=/
```

**正确示例**：
```
obfs=http;obfs-host=www.bing.com
```

每种插件的参数格式不同，请严格按照上方对应插件的示例填写。

### Shadow TLS 连接不上

1. 确认面板插件选项中的 `version` 与客户端一致；v2/v3 还必须确认 `password` 一致，v1 不需要密码
2. 确认 `host` 填写的域名可以从服务器正常访问（heki 需要连接该域名完成握手）
3. 日志中出现 `Shadow-TLS v1/v2/v3 enabled` 对应版本的提示，说明内置服务已正常启动
4. `client hello verify failed: unexpected record type` 是正常的，说明有非 Shadow TLS 客户端尝试连接被拒绝
5. Shadow TLS 不支持 UDP，如需 UDP 请在客户端启用 `udp_over_tcp`

### 外部插件不通

ResTLS 需要在服务器上部署对应外部进程。Gost 当前内置 `websocket / wss / mws / mwss / http2 / h2c / grpc / tls / mtls / kcp / pht / phts / quic`；仅少数未覆盖模式仍需外部进程。KCPTun 当前常用模式已内置，`tcp=true` 仅要求 Linux 与 raw socket / iptables 权限。

### XBoard 订阅下发正常，heki 还是没问题，但客户端订阅内容不对

先区分是不是面板订阅模板的问题：

- 如果 heki 日志里已经能看到 `plugin=gost`、`plugin=kcptun`、`plugin=v2ray-plugin` 等配置生效，说明 `Xboard -> heki` 这段通常没问题。
- 如果只有客户端订阅内容不对，优先检查你用的订阅格式是不是 `flag=shadowsocks`，以及插件选项里是否还在使用裸 `tls` / `nocomp` 这类无值参数。
- 这类问题的详细排查与修复位置见：[XBoard SS 插件订阅修复说明](ss/xboard-ss-subscription-fix.md)。

### 推荐方案

- 需要 TLS 伪装且不想部署外部进程 → **Shadow TLS v3**（heki 内置，无需域名证书）
- 需要过 CDN 或 WebSocket 传输 → **V2Ray Plugin**（heki 内置）
- 需要简单 HTTP/TLS 混淆 → **Simple Obfs HTTP/TLS**（heki 内置）
