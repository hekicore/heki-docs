# 增强限制用户 IP 数/设备数

## 支持情况

> 若使用中转，需确保后端能够`正确获取到用户的真实 IP`，否则将无法进行限制，参考: [中转获取真实 IP](forward-get-real-ip.md)

| 限制项 | 支持协议 |
|---|---|
| IP 数 | `vmess` / `vless` / `trojan` / `ss` / `ssr` / `hysteria2` / `tuic` / `anytls` / `naive` / `mieru` |
| 设备数 | 与 IP 数使用同一套限制逻辑，按不同客户端真实 IP 计数 |

## 原理

| 方式 | 说明 |
|---|---|
| 普通限制 | 仅单节点生效，节点之间不共享在线 IP/设备信息 |
| Redis 增强限制 | 多节点共享在线 IP/设备信息，可限制所有节点的同时在线 IP/设备数 |

## 一、准备 Redis

> 只需在任意一台服务器安装一个 redis 即可，需开启公网访问，并设置密码

| 系统 | 安装命令 | 配置文件 |
|---|---|---|
| CentOS | `yum install epel-release -y && yum install redis -y` | `/etc/redis.conf` |
| Ubuntu/Debian | `apt install redis-server -y` | `/etc/redis/redis.conf` |

写入以下核心配置：

```conf
bind 0.0.0.0
port 12345
requirepass your-password
```

启动并设置开机自启：

```bash
systemctl enable --now redis
```

> 若系统服务名为 `redis-server`，请将上面的 `redis` 改成 `redis-server`

## 二、配置 heki

| 配置名 | 默认值 | 说明 |
|---|---|---|
| `redis_enable` | `false` | 是否开启 Redis 全局 IP/设备数限制 |
| `redis_addr` | 无 | Redis 地址，格式：`host:port` |
| `redis_password` | 无 | Redis 密码 |
| `redis_db` | `0` | Redis 数据库编号 |
| `redis_tls` | `false` | 是否使用 TLS 连接 Redis |
| `conn_limit_expiry` | `60` | 在线 IP/设备缓存时间，单位：秒 |
| `redis_timeout_ms` | `300` | Redis 查询/记录超时，单位：毫秒；超时后自动退回本地限制 |

```
redis_enable=true
redis_addr=aaaa.com:12345
redis_password=xxxx
redis_db=0
redis_tls=false
conn_limit_expiry=60
redis_timeout_ms=300

# 若面板不支持限制用户 IP 连接数，还需设置此项
# 注意：此参数限制的是不同 IP（设备）数量，不是 TCP 连接数
# TCP 连接数限制请使用 user_tcp_limit
user_conn_limit=2
```

> 若 Redis 要求 TLS 连接，例如云 Redis 或已开启 TLS 的实例，可将 `redis_tls=true`
>
> `user_conn_limit` 只限制不同 IP/设备数量，不是 TCP 连接数；TCP 连接数请使用 `user_tcp_limit`。`ssr_cid_limit` 是旧版 SSR 单端口参数，现在通常不用配置；SSR 的 IP/设备数限制也按 `device_limit` / `user_conn_limit` 生效。

## 三、推荐参数

| 场景 | 推荐配置 |
|---|---|
| Redis 在公网 / 跨地域 | `redis_enable=true`<br>`conn_limit_expiry=60`<br>`redis_timeout_ms=300` |
| Redis 在同机房 / 同内网 | `redis_enable=true`<br>`conn_limit_expiry=60`<br>`redis_timeout_ms=500` |
| 更看重连接稳定 | 单节点可直接关闭 `redis_enable`；多节点建议保留 `redis_enable=true`，并使用较小的 `redis_timeout_ms` |

> 若内网链路非常稳定，可按实际情况适当提高 `redis_timeout_ms`，但不建议盲目调到秒级

## 四、常见问题

| 问题 | 简要说明 |
|---|---|
| 为什么面板上看起来超过了限制 IP 数 | Redis 全局限制限制的是`同时在线` IP 数，不是历史累计 IP 数 |
| Redis 掉线会不会影响用户使用 | 通常不会直接影响用户使用；heki 会自动退回单节点本地限制 |
| `conn_limit_expiry` 是什么 | 在线 IP/设备缓存时长；达到限制后切换 IP/设备，大致需等待该时间 |
| `redis_timeout_ms` 是什么 | Redis 查询/记录超时；越小越容易在波动时退回本地限制，但跨节点一致性也会更弱 |
| 多面板 / 多后端要多个 Redis 吗 | 不需要，分开使用不同 `redis_db` 即可 |
