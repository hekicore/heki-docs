# V2board 对接 mieru

!> 原版 V2Board 的实际兼容性取决于面板分支返回的 API 字段。若你的面板未返回 mieru 所需字段，建议优先使用 XBoard / PPanel。
!> Mieru 会基于用户名、密码和系统时间派生密钥。请确保客户端与服务端时间同步正常，推荐保持秒级误差；按上游协议文档，时间差理论上不应超过约 4 分钟。注意这里的 `2 分钟` 指的是协议里的时间取整窗口，不是建议的时间误差上限。

?> `mieru_user_hint_is_mandatory` 默认关闭，以优先兼容不携带 user hint 的旧版或第三方客户端。多用户节点如需降低异常连接或缺少 user hint 探测流量的 CPU 消耗，可在 `heki.conf` 或节点 `[USER]` 区设为 `true`。
?> `mieru_multiplexing` 属于客户端侧多路复用偏好。当前 heki 的 Mieru 服务端不会消费这个值，因此它不会改变服务端监听或转发行为。
?> Mieru 前面有中转层需要传递真实 IP 时，TCP 传输使用 `proxy_protocol=true`，UDP 传输使用 `udp_proxy_protocol=true`。Mieru UDP 只接收 Proxy Protocol v2 DGRAM 头；`force_proxy_protocol=true` 只有在对应开关开启后才会强制生效。

# 第一步，在面板添加一个节点

非常简单，教程省略

# 第二步，配置 heki

参考: [heki 详细配置项](heki/heki-config.md)

Mieru TCP 中转真实 IP 示例：

```ini
server_type=mieru
mieru_transport=TCP
proxy_protocol=true
```

Mieru UDP 中转真实 IP 示例：

```ini
server_type=mieru
mieru_transport=UDP
udp_proxy_protocol=true
```

## Mieru TCP 连接回收配置

从 Heki 1.2.9 起，下面三项额外回收策略默认全部关闭。不需要主动清理闲置 TCP 时，不添加这些参数即可；显式填写 `0` 或留空也表示关闭。

这些是 **Heki 后端参数**，填写在 `heki.conf` 主配置或对应节点的 `[USER]` 区，节点配置优先。无需修改面板或客户端订阅，修改后重启 Heki 生效。

### 三个参数分别管什么

Mieru 可以在一条底层 TCP 连接中复用多个业务会话。“没有会话”和“会话暂时没有流量”是不同状态：

| 参数 | 处理的连接 | 示例含义 | 是否影响仍存在的业务会话 |
|---|---|---|---|
| `mieru_handshake_timeout` | TCP 已连接，但一直没有建立过 Mieru 会话 | `30s`：等待建立首个会话的超时约为 30 秒 | 首个会话建立后，不再按此规则回收 |
| `mieru_empty_timeout` | 曾经有会话，但所有会话已结束，底层 TCP 留着等待复用 | `6m30s`：空连接保留约 6 分 30 秒后回收；期间重新建立会话则不按空连接处理 | 不会仅因暂时没流量而关闭仍有会话的连接 |
| `mieru_tcp_idle_timeout` | 底层 TCP 持续没有读取或写入数据，不论是否还有会话 | `10m`：双向均无数据约 10 分钟后回收；任一方向有数据则重新计时 | **可能关闭仍有静默会话的连接**，例如长时间无数据的业务长连接 |

三项均只针对 Mieru 的 **TCP 底层传输**，不用于回收 UDP 底层传输；这里判断的是底层连接，不是代理目标使用 TCP 还是 UDP。它们也不是用户连接数量上限，不负责限制“最多允许多少条连接”。

时长需要带单位，例如 `30s`、`6m30s`、`10m`、`1h`，不能用裸数字 `30` 代替 `30s`。`mieru_tcp_idle_timeout` 开启时至少为 `1m`。实际清理会受维护检查周期影响，不保证到点瞬间断开。

### 场景一：不额外回收（默认）

```ini
mieru_handshake_timeout=0
mieru_empty_timeout=0
mieru_tcp_idle_timeout=0
```

关闭的是这三项超时策略，并不阻止客户端主动断开、网络错误处理、用户会话关闭或停止服务时的正常资源释放。

### 场景二：只清理未建立会话和已经用完的空连接

如果希望恢复旧版的握手和空 TCP 回收策略，可使用：

```ini
# TCP 连上后迟迟不建立 Mieru 会话，约 30 秒后清理
mieru_handshake_timeout=30s

# 所有会话结束后，底层 TCP 再保留约 6 分 30 秒供复用
mieru_empty_timeout=6m30s

# 不因业务会话暂时没有数据而主动回收
mieru_tcp_idle_timeout=0
```

旧版的“6 分 30 秒”对应第二项等待时间，不是 6 条或 30 条连接。握手超时太短可能影响慢速或高延迟链路，空连接保留时间太短则会增加客户端重新连接的次数。

### 场景三：连静默业务连接也需要回收

在场景二基础上，按需把第三项改为：

```ini
mieru_tcp_idle_timeout=10m
```

这会连同仍有会话、但底层 TCP 双向持续无数据的连接一起关闭，业务需要重新连接。希望保留长时间静默连接时，保持该项为 `0`。客户端若持续发送心跳等数据，连接可能一直不满足无流量条件。

三个开关独立生效，同时开启时，满足任意一项回收条件就可能关闭连接；`mieru_empty_timeout` 不会覆盖或延长 `mieru_tcp_idle_timeout`。

# 第三步，启动 heki

```
heki start
```

若出现启动失败的情况，使用`heki log`查看错误信息
