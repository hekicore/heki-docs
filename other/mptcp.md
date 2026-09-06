# MPTCP（Multipath TCP）

## 功能说明

MPTCP（Multipath TCP）允许一个 TCP 连接同时使用多条网络路径传输数据，可以提高带宽利用率和连接可靠性。

heki 支持在监听端口上启用 MPTCP，当客户端和网络也支持 MPTCP 时，连接可以自动利用多条路径。

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

## 注意事项

- 仅对 TCP 协议有效，不影响 Hysteria2 和 TUIC（基于 QUIC/UDP）
- 如果系统或网络栈不支持 MPTCP，开启后可能导致监听失败并启动报错；遇到这种情况请关闭 `mptcp=false` 后重启
- 多数场景下无需开启，除非你明确了解 MPTCP 的使用场景
