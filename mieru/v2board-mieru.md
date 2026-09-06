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

# 第三步，启动 heki

```
heki start
```

若出现启动失败的情况，使用`heki log`查看错误信息
