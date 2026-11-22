# XUDP 与 WebSocket 保活

## XUDP 支持

Heki 的 VMess、VLESS 支持 XUDP，无需增加服务端开关。XUDP 将 UDP 数据报封装到代理连接中；需要客户端支持并选择 XUDP，同时开启 UDP 转发。它与 Shadowsocks 的 UoT 是不同的封装，不能混用。

1.3.0 已有 XUDP，但 VMess 在同一个 XUDP 会话切换 UDP 目标时，会错误地沿用首个目标。本次修复允许逐包选择目标，并返回对应的来源地址；VLESS 已支持这一行为。上述 VMess 修复与 `ws_heartbeat` 从 1.3.1 起提供，1.3.0 不具备这些修复和配置项。

支持范围以所用传输和客户端为准：VMess/VLESS 的 TCP、WS、WS+TLS 可承载 XUDP；VLESS Reality + TCP + Vision 也已有 XUDP 支持。WS 不能与 `xtls-rprx-vision` flow 组合，WS 节点的 flow 应为空或 `none`。不承诺 Xray XUDP GlobalID 的跨外层连接会话迁移。

Mihomo 示例（将地址、UUID、路径和 TLS 域名替换为实际节点配置）：

```yaml
proxies:
  - name: Heki-VLESS-WS
    type: vless
    server: node.example.com
    port: 443
    uuid: 11111111-1111-1111-1111-111111111111
    network: ws
    tls: true
    servername: node.example.com
    udp: true
    packet-encoding: xudp
    ws-opts:
      path: /vless
      headers:
        Host: node.example.com
```

VMess 使用对应节点的 `type: vmess`、`cipher: auto`（AEAD 订阅建议省略 `alterId`），其余 WS/TLS 参数按节点填写，保留 `udp: true` 与 `packet-encoding: xudp`。客户端订阅没有输出这些选项时，需要在客户端覆盖或调整订阅模板；仅修改 Heki 不会改写客户端订阅。

## WS 主动心跳

Heki 已能回复客户端 Ping。本次新增主动定时发送标准 WebSocket Ping，适用于经 Nginx、CDN 等代理后，因传输连接空闲而被提前关闭的 VMess/VLESS WS 连接。

主配置 `heki.conf`：

```ini
# 单位秒，默认 0 关闭，范围 0..86400；按需开启
ws_heartbeat=30
```

仅对一个节点开启时，在其 `nodes/node_<ID>.conf` 已有 `[USER]` 标记下添加：

```ini
ws_heartbeat=30
```

其他节点继承主配置；节点写 `ws_heartbeat=0` 可单独关闭，删除该行恢复继承。修改后重启所属实例。`heki config --effective` 可查看启动时的值及来源。

Docker Compose 使用小写环境变量，按现有配置结构添加：

```yaml
services:
  heki:
    environment:
      ws_heartbeat: "30"
```

修改环境变量后执行 `docker compose up -d` 重新创建容器。优先级：节点 `[USER]` > 小写环境变量 > 主配置文件 > 默认 `0`。

注意：

- 间隔应小于前置代理的空闲超时，例如代理为 60 秒时可设为 30 秒。前置代理需要支持 WebSocket 并允许控制帧通行。
- 仅用于 VMess/VLESS 的 WS（含 WS+TLS），不影响 TCP、HTTPUpgrade、XHTTP、gRPC 或其他协议。客户端应正常处理标准 Ping/Pong，无需新增专用握手。
- 控制帧不计入用户代理流量，也不会延长 `tcp_timeout` 或 XUDP 的 `udp_timeout`；这些业务空闲超时依然有效。持续数据写入时会跳过当次心跳，避免排队。
- 心跳不能防止网络切换、代理硬性连接寿命限制、客户端休眠或主动断线。若仍断线，应记录客户端版本、断线间隔及中间代理，再结合日志定位。
