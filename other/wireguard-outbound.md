# WireGuard 出口

把命中规则的流量通过 WireGuard 隧道送出去。heki 内置用户态 WireGuard，不需要在节点上安装 `wireguard-tools`、不创建系统网卡、不需要 root，也不改系统路由表。

以前的做法是本机再跑一个 mihomo / sing-box 连 WireGuard，heki 用 `socks` 出口接过去。现在直接写 `type="wireguard"` 即可，本地 `routes.toml`、远程 `routes_url`、面板 `custom_outbounds` 三处都能用。

!> 本页示例里的密钥是为了让示例可以直接通过校验而生成的演示值，请全部替换成你自己的。

## 一、字段对照

手里通常已经有一份标准的 WireGuard 客户端配置（自建服务器生成的，或服务商提供的）：

```ini
[Interface]
PrivateKey = eBBDDuGXxQXPuoLynRrlE09qjsf/JNLIu0akFktNTX8=
Address = 10.66.0.2/32
DNS = 1.1.1.1
MTU = 1420

[Peer]
PublicKey = rulahMx/Wx+NaGt/GGzIu4YUHhFa+HlBFpVzb7/vCjs=
PresharedKey = eKjZTxcbkQ4yTc5M45iYkFlVBR/q1KIqpPK+vKCx7FA=
Endpoint = wg.example.com:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
```

逐项抄到 heki 的出口配置里：

| WireGuard 配置 | heki 字段 | 必填 | 说明 |
|---|---|---|---|
| `[Peer] Endpoint` 的主机 | `server` | 是 | 域名或 IP |
| `[Peer] Endpoint` 的端口 | `port` | 是 | |
| `[Interface] PrivateKey` | `private_key` | 是 | 本端私钥 |
| `[Peer] PublicKey` | `public_key` | 是 | 对端（服务器）公钥，不是本端公钥 |
| `[Interface] Address` | `address` | 是 | 本端隧道地址；双栈写 `"10.66.0.2/32,fd00::2/128"` |
| `[Peer] PresharedKey` | `pre_shared_key` | 否 | |
| `[Interface] MTU` | `mtu` | 否 | 默认 `1420` |
| `[Peer] PersistentKeepalive` | `keepalive` | 否 | 秒；默认不发送 |
| `[Interface] DNS` | `dns` | 否 | 见下文「域名解析」 |
| 无 | `reserved` | 否 | 3 个保留字节，个别服务（如 Cloudflare WARP）要求；写 `"1,2,3"` 或 3 字节的 base64 |

`AllowedIPs` 不用填：heki 是否走这个出口由路由规则决定，隧道本身放行全部目标。

上面那份配置对应的 heki 出口：

```toml
[[routes.Outs]]
type="wireguard"
server="wg.example.com"
port=51820
private_key="eBBDDuGXxQXPuoLynRrlE09qjsf/JNLIu0akFktNTX8="
public_key="rulahMx/Wx+NaGt/GGzIu4YUHhFa+HlBFpVzb7/vCjs="
address="10.66.0.2/32"
pre_shared_key="eKjZTxcbkQ4yTc5M45iYkFlVBR/q1KIqpPK+vKCx7FA="
mtu=1420
keepalive=25
```

## 二、自建 WireGuard 服务器（已有配置可跳过）

在出口服务器上生成两对密钥（服务器一对、heki 一对）：

```bash
wg genkey | tee server.key | wg pubkey > server.pub
wg genkey | tee heki.key   | wg pubkey > heki.pub
```

出口服务器 `/etc/wireguard/wg0.conf`：

```ini
[Interface]
Address = 10.66.0.1/24
ListenPort = 51820
PrivateKey = <server.key 的内容>
PostUp   = iptables -t nat -A POSTROUTING -s 10.66.0.0/24 -o eth0 -j MASQUERADE
PostDown = iptables -t nat -D POSTROUTING -s 10.66.0.0/24 -o eth0 -j MASQUERADE

[Peer]
# 一个 heki 进程对应一个 [Peer]
PublicKey = <heki.pub 的内容>
AllowedIPs = 10.66.0.2/32
```

```bash
sysctl -w net.ipv4.ip_forward=1   # 持久化请写入 /etc/sysctl.conf
wg-quick up wg0
```

`eth0` 换成服务器实际的出口网卡；防火墙 / 安全组需要放行 UDP `51820`。

heki 侧用 `heki.key`（私钥）、`server.pub`（对端公钥）和 `10.66.0.2/32`（本端地址）。

!> 一对密钥同一时间只能给一个 heki 进程使用。WireGuard 服务器会把回包发给「最后一个用这把密钥发包的地址」，多台机器共用同一把私钥会互相抢占，表现为时通时断。多台 heki 请在服务器上各加一个 `[Peer]`（各自的密钥和隧道地址）。同一个 heki 进程里的多个 `node_id` 共用一条隧道，不受影响。

## 三、使用示例

### 示例 1：全部流量走 WireGuard

`routes.toml`：

```toml
enable=true

[[routes]]
rules=["*"]

[[routes.Outs]]
type="wireguard"
server="wg.example.com"
port=51820
private_key="eBBDDuGXxQXPuoLynRrlE09qjsf/JNLIu0akFktNTX8="
public_key="rulahMx/Wx+NaGt/GGzIu4YUHhFa+HlBFpVzb7/vCjs="
address="10.66.0.2/32"
```

### 示例 2：只让流媒体走 WireGuard，其余直连

```toml
enable=true

[[routes]]
rules=["geosite:netflix", "geosite:disney", "domain:openai.com"]

[[routes.Outs]]
type="wireguard"
server="wg-us.example.com"
port=51820
private_key="eBBDDuGXxQXPuoLynRrlE09qjsf/JNLIu0akFktNTX8="
public_key="rulahMx/Wx+NaGt/GGzIu4YUHhFa+HlBFpVzb7/vCjs="
address="10.66.0.2/32"
# 用隧道内的 DNS 解析，解析结果与出口所在地区一致
dns="1.1.1.1"

# 兜底：其余流量直连。启用本地路由后没有兜底的流量会被拒绝
[[routes]]
rules=["*"]

[[routes.Outs]]
type="direct"
```

规则写的是域名而客户端经常只发 IP 时，请同时开启 [域名嗅探](other/domain-sniff.md)。

### 示例 3：多个 WireGuard 出口负载均衡

同一条路由下写多个出口，每条新连接随机选一个：

```toml
enable=true

[[routes]]
rules=["*"]

[[routes.Outs]]
type="wireguard"
server="wg-a.example.com"
port=51820
private_key="eBBDDuGXxQXPuoLynRrlE09qjsf/JNLIu0akFktNTX8="
public_key="rulahMx/Wx+NaGt/GGzIu4YUHhFa+HlBFpVzb7/vCjs="
address="10.66.0.2/32"

[[routes.Outs]]
type="wireguard"
server="wg-b.example.com"
port=51820
private_key="cJiATqBpTww24Rew4qAL3QUkT8RTARSvdps+zHh9pH0="
public_key="rulahMx/Wx+NaGt/GGzIu4YUHhFa+HlBFpVzb7/vCjs="
address="10.77.0.2/32"
```

### 示例 4：远程 `routes_url` 批量下发，每个节点用自己的密钥

所有节点在 `heki.conf` 里指向同一个地址：

```
routes_url=https://config.example.com/routes.toml
```

远程文件里用 `node_id:` 给每个节点分配各自的出口（`node_id` 规则命中后直接使用该路由的出口）。这样一份文件管理所有节点，又不会出现多台机器共用一把密钥的问题：

```toml
enable=true

# 节点 101
[[routes]]
rules=["node_id:101"]

[[routes.Outs]]
type="wireguard"
server="wg.example.com"
port=51820
private_key="eBBDDuGXxQXPuoLynRrlE09qjsf/JNLIu0akFktNTX8="
public_key="rulahMx/Wx+NaGt/GGzIu4YUHhFa+HlBFpVzb7/vCjs="
address="10.66.0.2/32"

# 节点 102
[[routes]]
rules=["node_id:102"]

[[routes.Outs]]
type="wireguard"
server="wg.example.com"
port=51820
private_key="cJiATqBpTww24Rew4qAL3QUkT8RTARSvdps+zHh9pH0="
public_key="rulahMx/Wx+NaGt/GGzIu4YUHhFa+HlBFpVzb7/vCjs="
address="10.66.0.3/32"
```

远程文件每 1 分钟刷新一次，改完不需要重启。

!> 远程文件里有私钥，请只通过 HTTPS 提供，并限制谁能访问这个地址。

### 示例 5：面板下发（XBoard / XiaoV2Board / PPanel / heki-v1）

在面板的 `custom_outbounds` 里定义出口，再用路由规则引用它的 `tag`。节点收到的配置形如：

```json
{
  "custom_outbounds": [
    {
      "tag": "wg-us",
      "type": "wireguard",
      "server": "wg-us.example.com",
      "server_port": 51820,
      "private_key": "eBBDDuGXxQXPuoLynRrlE09qjsf/JNLIu0akFktNTX8=",
      "public_key": "rulahMx/Wx+NaGt/GGzIu4YUHhFa+HlBFpVzb7/vCjs=",
      "address": ["10.66.0.2/32"],
      "mtu": 1420
    }
  ],
  "routes": [
    {
      "id": 1,
      "match": ["geosite:netflix", "domain:openai.com"],
      "action": "route",
      "action_value": "wg-us"
    }
  ]
}
```

> 上面是 XBoard 系列的字段位置。PPanel 的出口写在节点配置的 `outbound` 列表里（`name` 即 tag，`rules` 即匹配规则），heki-v1 写在 `runtime.custom_outbounds` / `runtime.routes` 下，出口对象本身的字段相同。

面板没有 `custom_outbounds` 入口时，也可以把整个出口对象直接写进路由的 `action_value`（JSON 对象或 JSON 字符串都可以）：

```json
{
  "routes": [
    {
      "id": 2,
      "match": ["geosite:netflix"],
      "action": "route",
      "action_value": "{\"type\":\"wireguard\",\"server\":\"wg-us.example.com\",\"server_port\":51820,\"private_key\":\"eBBDDuGXxQXPuoLynRrlE09qjsf/JNLIu0akFktNTX8=\",\"public_key\":\"rulahMx/Wx+NaGt/GGzIu4YUHhFa+HlBFpVzb7/vCjs=\",\"address\":\"10.66.0.2/32\"}"
    }
  ]
}
```

面板出口除了上面的 heki 字段，也接受 sing-box 和 Xray 的 WireGuard 写法，可以直接粘贴现成的配置：

```json
{
  "custom_outbounds": [
    {
      "tag": "wg-singbox",
      "type": "wireguard",
      "server": "wg.example.com",
      "server_port": 51820,
      "local_address": ["10.66.0.2/32"],
      "private_key": "eBBDDuGXxQXPuoLynRrlE09qjsf/JNLIu0akFktNTX8=",
      "peer_public_key": "rulahMx/Wx+NaGt/GGzIu4YUHhFa+HlBFpVzb7/vCjs=",
      "reserved": [0, 0, 0]
    },
    {
      "tag": "wg-xray",
      "protocol": "wireguard",
      "settings": {
        "secretKey": "eBBDDuGXxQXPuoLynRrlE09qjsf/JNLIu0akFktNTX8=",
        "address": ["10.66.0.2/32"],
        "peers": [
          {
            "publicKey": "rulahMx/Wx+NaGt/GGzIu4YUHhFa+HlBFpVzb7/vCjs=",
            "endpoint": "wg.example.com:51820"
          }
        ]
      }
    }
  ]
}
```

面板上修改路由或出口后不需要重启 heki：下一个用户同步周期（`check_interval`，面板下发 `pull_interval` 时以面板为准）会自动加载，新路由用于之后新建的连接。若修改了 WireGuard 的 `address`、`pre_shared_key` 或 `reserved`，首次使用新配置时会重建隧道并断开原隧道上的连接，详见下文「重载」。新配置未通过加载校验时 heki 保留原来的路由，并在日志里打印 `the new config was rejected` 和具体原因。

面板路由优先于本地 / 远程路由，详见 [路由优先级](other/routes-config.md)。

## 四、行为说明

- **TCP 和 UDP 都走隧道。**
- **按需建立**：第一条命中该出口的连接触发握手，所以第一条连接会多一次握手的延迟。没有连接且空闲 5 分钟后隧道自动关闭，下次使用时重新建立。
- **重载**：一对密钥（本端私钥 + 对端公钥）对应一条隧道，本地、远程或面板路由重载时：
  - 配置没变：继续复用原隧道，已有连接不受影响。
  - 改了 `mtu`、`keepalive`、`server` / `port`：在原隧道上直接更新，已有连接保留。
  - 改了 `address`、`pre_shared_key`、`reserved`：这三项无法在已建立的隧道上修改。新配置下的第一条连接会立即重建隧道，新连接马上可用，原隧道上的连接会断开（日志里有一行 `wireguard outbound ... restarting`）。
  - 换了密钥：按新隧道处理，旧隧道上的连接跑完后空闲回收。
  - 改 `dns` 只影响之后新建的连接。
- **同一对密钥只能有一组隧道参数**：同一份路由里使用同一对密钥的多个出口，`address` / `pre_shared_key` / `reserved` 必须一致，否则加载时报错并指出是哪两个出口；`mtu`、`keepalive`、`dns` 可以不同（`mtu` 和 `keepalive` 以最近一次加载的为准）。需要不同的隧道地址请用不同的密钥。
- **域名解析**：
  - 没配 `dns`：目标域名按 heki 自己的解析顺序（[DNS 规则](other/dns-config.md) > `default_dns` > 系统 DNS）解析成 IP，再经隧道连接。
  - 配了 `dns`：由隧道对端的这台 DNS 解析，查询本身也走隧道。适合需要「解析结果与出口地区一致」的解锁场景。`dns` 的地址族必须与 `address` 一致。
- **协议族**：隧道只能到达与 `address` 同协议族的目标。只配了 IPv4 地址时，纯 IPv6 目标会失败；需要 IPv6 请在 `address` 里同时写上 IPv6 地址（服务器端也要给这个 peer 分配并转发 IPv6）。
- **`server` 是域名时**：隧道建立时解析一次；之后如果连接超时，heki 会重新解析（最多每 30 秒一次），地址变了就切换过去，适用于 DDNS。
- `listen` 字段对 wireguard 出口无效。

## 五、验证与排障

第一条连接命中出口时，日志会出现：

```
[INFO] Routes: wireguard outbound wg.example.com:51820 started (endpoint=203.0.113.10:51820, mtu=1420)
```

把 `log_level` 设为 `debug` 可以看到每条连接走了哪个出口：

```
[DEBUG] [Node 1] Route: www.netflix.com:443 -> wireguard(wg.example.com:51820) (domain=www.netflix.com, ip=..., port=443)
```

| 现象 / 日志 | 原因与处理 |
|---|---|
| 启动或重载时报 `missing private_key` / `missing public_key` / `missing address` | 必填字段没写。`public_key` 是服务器的公钥 |
| `invalid private_key: expected a 32-byte key in base64 or hex` | 密钥被截断或多了空格；应是 `wg genkey` 输出的 44 个字符 |
| 拨号失败并带有 `wireguard handshake has never completed` | 隧道从未握手成功：检查 `server` / `port` 和服务器防火墙是否放行 UDP；检查密钥是否成对（heki 的公钥是否已加到服务器的 `[Peer]`）；服务器是否要求 `pre_shared_key` 或 `reserved` |
| 能握手但所有目标都超时 | 服务器没开转发或没做 NAT（见第二节的 `ip_forward` 和 `MASQUERADE`）；或服务器 `[Peer] AllowedIPs` 里没有 heki 的隧道地址 |
| 时通时断 | 多台机器共用了同一把私钥（见第二节的提示） |
| 加载路由时报 `use the same wireguard key pair but different address / pre_shared_key / reserved` | 同一份路由里两个出口用了同一对密钥，但隧道参数不一致；改成一致，或给其中一个换一对密钥 |
| 小请求正常，大流量或 HTTPS 握手卡住 | 路径 MTU 偏小，把 `mtu` 调低（如 `1380`、`1280`） |
| `no address of xxx is reachable with the tunnel's address family` | 目标只有 IPv6 而隧道只有 IPv4（或相反） |
| `resolve xxx through tunnel dns` 失败 | `dns` 填的服务器从出口那一侧访问不到 |
| 空闲一段时间后第一条连接慢 | 隧道空闲回收后重新握手，属正常现象；经过 NAT 且需要保持映射时可设 `keepalive=25` |
