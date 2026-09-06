# ppanel 对接 mieru

!> Mieru 会基于用户名、密码和系统时间派生密钥。请确保客户端与服务端时间同步正常，推荐保持秒级误差；按上游协议文档，时间差理论上不应超过约 4 分钟。注意这里的 `2 分钟` 指的是协议里的时间取整窗口，不是建议的时间误差上限。

## 第一步，在面板添加一个节点

在 ppanel 后台添加 Mieru 节点，配置端口和传输协议。

可选配置项：
- `transport` / `network`：传输协议（TCP 或 UDP，默认 TCP）；PPanel 新版使用 `network` 时也会接入同一运行字段
- `multiplex`：客户端侧多路复用偏好（low / middle / high）。当前 heki 的 Mieru 服务端不会消费该值，因此它不会改变服务端监听或转发行为
- `traffic_pattern`：可由 PPanel 下发并接入 Mieru 服务端流量模式
- `user_hint_is_mandatory`：可由 PPanel 下发；也可在 `heki.conf` 或节点 `[USER]` 区通过 `mieru_user_hint_is_mandatory` 配置，默认关闭

如果 Mieru 前面有中转层需要传递真实 IP，可在 heki 配置里开启 Proxy Protocol：

```ini
# Mieru TCP
transport=TCP
proxy_protocol=true

# Mieru UDP
transport=UDP
udp_proxy_protocol=true
```

Mieru TCP 支持 Proxy Protocol v1 / v2；Mieru UDP 只接收 Proxy Protocol v2 DGRAM 头。`force_proxy_protocol=true` 可用于强制要求前置中转发送 Proxy Protocol 头，但只有在对应的 `proxy_protocol` 或 `udp_proxy_protocol` 开启后才会生效。

> Mieru 自带加密（XChaCha20-Poly1305），不需要额外配置 TLS 证书
>
> 显式开启 user hint 强制校验后，异常连接或缺少 hint 的探测流量不会遍历全部用户逐个尝试解密，可降低多用户节点 CPU 消耗。
>
> 若后续出现“配置没变但突然全部超时、重启 heki 无法恢复”的现象，优先检查服务器系统时间和 NTP 同步状态。

## 第二步，配置 heki

```ini
type=ppanel
server_type=mieru
panel_url=https://your-ppanel.com
panel_key=your-secret-key
node_id=1
```

参考: [heki 详细配置项](heki/heki-config.md)

## 第三步，启动 heki

```bash
heki start
```

若出现启动失败的情况，使用 `heki log` 查看错误信息
