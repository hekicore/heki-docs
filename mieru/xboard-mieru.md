# xboard 对接 mieru

?> heki 已支持读取 XBoard `mieru` 节点里的 `traffic_pattern` 字段，也就是面板里常见的 “流量(Base64)” / `traffic_pattern` 配置。
!> Mieru 会基于用户名、密码和系统时间派生密钥。请确保客户端与服务端时间同步正常，推荐保持秒级误差；按上游协议文档，时间差理论上不应超过约 4 分钟。注意这里的 `2 分钟` 指的是协议里的时间取整窗口，不是建议的时间误差上限。

## 前提条件

- xboard 面板已部署并正常运行
- 已获取 heki 授权码

## 面板配置

1. 在 xboard 后台添加节点，协议选择 `mieru`
2. 配置节点端口和传输协议参数
3. 如果面板里有 “流量(Base64)” / `traffic_pattern` 字段，可直接填写 Base64 编码的 mieru `TrafficPattern` protobuf；留空则表示不启用流量特征微调
4. 保存节点配置

## heki 配置

```
type=xboard
server_type=mieru
node_id=节点ID
heki_key=你的授权码
panel_url=https://你的面板地址
panel_key=你的通信密钥
```

heki 需要手动指定 `server_type` 来配置协议类型，端口、加密方式等参数会自动从面板获取。

## Mieru 特有配置（可选）

| 参数名 | 默认值 | 说明 |
|-------|--------|------|
| `mieru_transport` | `TCP` | 传输协议，可选: `TCP`、`UDP` |
| `mieru_multiplexing` | `MULTIPLEXING_LOW` | 兼容保留的客户端侧多路复用偏好，可选: `MULTIPLEXING_OFF`、`MULTIPLEXING_LOW`、`MULTIPLEXING_MIDDLE`、`MULTIPLEXING_HIGH`。当前 heki 服务端不消费该值 |
| `mieru_traffic_pattern` | 空 | Base64 编码的 mieru `TrafficPattern` protobuf。若面板已下发 `traffic_pattern`，heki 会自动读取；本地填写时可作为覆盖值 |
| `mieru_user_hint_is_mandatory` | `false` | 是否强制要求客户端携带 user hint。默认关闭以优先兼容旧版或第三方 Mieru 客户端；多用户节点如需降低异常连接或旧式探测流量下的 CPU 消耗可设为 `true` |

## Mieru 中转获取真实 IP（Proxy Protocol）

Mieru 的 TCP 和 UDP Proxy Protocol 开关是分开的：

- `mieru_transport=TCP` 时，使用 `proxy_protocol=true`
- `mieru_transport=UDP` 时，使用 `udp_proxy_protocol=true`
- `force_proxy_protocol=true` 只在对应的 TCP / UDP Proxy Protocol 开关开启后生效，用于强制要求前置中转必须发送 Proxy Protocol 头

TCP 示例：

```ini
server_type=mieru
mieru_transport=TCP
proxy_protocol=true
```

UDP 示例：

```ini
server_type=mieru
mieru_transport=UDP
udp_proxy_protocol=true
```

Mieru TCP 支持 Proxy Protocol v1 / v2；Mieru UDP 只接收 Proxy Protocol v2 DGRAM 头。未开启以上开关时会保持原有直连行为，不影响普通 Mieru 客户端。

## 说明

- Mieru 协议自带加密（XChaCha20-Poly1305），不需要额外配置 TLS
- 用户认证使用面板下发的 UUID 作为密码
- 支持 TCP 和 UDP 两种传输模式
- 如果出现“配置没变但突然全部超时、重启 heki 无法恢复”的现象，优先检查服务器系统时间和 NTP 同步状态
- 如果 XBoard 面板返回了 `multiplexing`，heki 也会兼容读取，但当前仅用于保留配置语义，不会改变服务端监听行为
- 如果 XBoard 面板返回了 `traffic_pattern`，heki 会在启动时解码并写入官方 mieru 服务端配置
- `mieru_traffic_pattern` 需要填写合法的 Base64 字符串；若内容非法，heki 启动时会直接报错，避免把错误配置静默带到运行时
- `mieru_user_hint_is_mandatory` 默认关闭，可兼容不携带 hint 的旧客户端；开启后会要求客户端携带 user hint，缺少 hint 的异常流量不会进入多用户逐个尝试解密的高 CPU 路径
- `mieru_multiplexing` 属于客户端侧多路复用偏好，当前 heki 服务端不消费该参数，无需在服务端额外配置

如果你不想依赖面板，也可以在本地手工覆盖：

```ini
mieru_traffic_pattern=CgIIBw==
mieru_user_hint_is_mandatory=true
```

## 启动

```bash
heki restart
```

查看日志确认启动成功：

```bash
heki log
```
