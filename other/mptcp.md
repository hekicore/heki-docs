# MPTCP（Multipath TCP）

## 功能说明

MPTCP（Multipath TCP）允许一个 TCP 连接同时使用多条网络路径传输数据，可以提高带宽利用率和连接可靠性。

Heki 的 `mptcp` 开关控制 TCP 入站监听。只有客户端也使用 MPTCP，并且操作系统、网络和路径管理配置满足条件，才可能为同一连接建立多条子连接；开启开关本身不会自动叠加带宽，也不会自动把 Heki 到目标网站的出站连接变成多路径。

## 适用场景与默认建议

建议保持默认的 `mptcp=false`。普通单线路节点通常没有可利用的额外路径，普通代理客户端也不一定使用 MPTCP。

| 场景 | 可能的收益与条件 |
|---|---|
| 可控的 Linux 双线路中转或网关 | 两端支持 MPTCP，配置多地址、路由和子连接策略后，可让一条 TCP 连接利用多条路径；实际吞吐仍受瓶颈和调度影响 |
| 路径故障切换 | 已建立可用的额外子连接时，一条路径断开后可通过剩余路径维持连接 |
| Wi-Fi 与蜂窝网络切换 | 仅适用于操作系统和客户端确实启用 MPTCP、且允许同时使用两种网络的场景 |

多网卡不等于已经建立多路径。启用后应结合系统 MPTCP 状态、子连接数量和故障切换实测确认效果；不能仅凭 Heki 启动成功判断已经聚合带宽。

## 配置参数

| 参数名     | 默认值     | 说明                                                                     |
|---------|---------|--------------------------------------------------------------------------|
| `mptcp` | `false` | 是否开启监听 MPTCP。此开关只表示开启，实际效果取决于操作系统和网络是否支持 MPTCP |

## 配置示例

```
mptcp=true
```

## 前提条件

- Linux 内核 5.6+ 原生支持 MPTCP
- 需要在系统层面启用 MPTCP：
  ```bash
  # 检查是否支持
  sysctl net.mptcp.enabled

  # 启用 MPTCP
  sysctl -w net.mptcp.enabled=1

  # 永久生效
  echo "net.mptcp.enabled=1" >> /etc/sysctl.conf
  sysctl -p
  ```
- 客户端也需要支持 MPTCP 才能生效
- 需要有多条可达路径，并按部署环境配置 MPTCP endpoint、子连接限制、策略路由及防火墙；仅设置上述 sysctl 不会自动完成这些配置

## 关闭时的行为

`mptcp=false`（默认）时，Heki 的 TCP 监听会明确关闭 MPTCP。Go 运行时在系统支持的情况下默认给监听端口开启 MPTCP，早期版本在 `mptcp=false` 时沿用了这个默认值，所以系统开了 `net.mptcp.enabled=1` 的机器上，即使没有配置也会接受 MPTCP 连接。现在是否接受只由 `mptcp` 决定，包括 Mieru 的 TCP 监听。原先依赖这一隐式行为的，需要显式写 `mptcp=true`。

## 注意事项

- 仅对 TCP 协议有效，不影响 Hysteria2 和 TUIC（基于 QUIC/UDP）
- 当前 Go 运行时在 MPTCP 不可用或创建 MPTCP 监听失败时，会尝试回退到普通 TCP；因此 `mptcp=true` 和监听成功都不保证连接实际使用 MPTCP
- `xhttp` / `splithttp` 目前不能与 `mptcp=true` 同开
- 多数场景下无需开启，除非你明确了解 MPTCP 的使用场景
