# 增强限制用户 IP 数/设备数

## 支持限制连接`IP`数的协议

> 若使用中转，需确保后端能够`正确获取到用户的真实 IP`，否则将无法进行限制，详情参考: [这里](other/forward-get-real-ip.md)

| 协议     |     |
|--------|-----|
| vmess  | ✅   |
| vless  | ✅   |
| trojan | ✅   |
| ss     | ✅   |
| ssr    | ✅   |

## 支持限制连接`设备`数的协议

> 只有 ssr 的`协议单端口`设计了此项功能，其他协议不支持

| 协议        |     |
|-----------|-----|
| ssr 协议单端口 | ✅   |

## 什么是增强限制用户的 IP 数/设备数

普通的限制方式只能做到`单节点`下进行限制，因为节点之间`不互相通信`，A 节点无从得知用户是否在使用 A 以外的其它节点。

heki 增强了该功能，可做到`所有节点`进行限制用户同时连接的 IP 数/设备数。

## 一、安装 redis

> 只需在任意一台服务器安装一个 redis 即可，需开启公网访问，并设置密码

#### CentOS

```
yum install epel-release -y
yum install redis -y
```

#### Ubuntu/Debian

```
apt install redis-server -y
```

### 配置 redis

#### CentOS

```
echo "" > /etc/redis.conf
echo "bind 0.0.0.0" >> /etc/redis.conf
echo "port 12345" >> /etc/redis.conf
echo "requirepass fgsdfgasgdfui" >> /etc/redis.conf
```

#### Ubuntu/Debian

```
echo "" > /etc/redis/redis.conf
echo "bind 0.0.0.0" >> /etc/redis/redis.conf
echo "port 12345" >> /etc/redis/redis.conf
echo "requirepass fgsdfgasgdfui" >> /etc/redis/redis.conf
```

### 启动 redis 并设置开机自启

```
systemctl start redis
systemctl enable redis
```

## 二、配置 heki

| 配置名                 | 默认值     | 说明                          |
|---------------------|---------|-----------------------------|
| `redis_enable`      | `false` | 是否开启 redis 限制 IP/设备数        |
| `redis_addr`        | 无       | redis 地址，格式：`aaa.com:12345` |
| `redis_password`    | 无       | redis 密码                    |
| `redis_db`          | `0`     | redis 数据库编号，默认 0，无需更改       |
| `conn_limit_expiry` | `60`    | 缓存在线 IP 的时间，单位：秒            |

```
redis_enable=true
redis_addr=aaaa.com:12345
redis_password=xxxx
redis_db=0
conn_limit_expiry=60

# 若面板不支持限制用户 IP 连接数，还需设置此项
user_conn_limit=2
```

## 三、常见问题

### 为什么配置了 redis 全局限制，面板上仍然显示超过了限制数的 IP

> redis 全局限制是保证`同时连接的 IP 数量不超过设定的数值`，若多个 IP 并没有同时使用，则未达到限制条件

### redis 服务掉线会不会影响用户使用

> 不会影响用户正常使用，但是增强限制 IP 数/连接数就会失效，会退回到单节点限制，直到 redis 服务再次可访问

### conn_limit_expiry 具体含义是什么

> 该值为缓存在线 IP/设备的时间，单位：秒。简单解释：当用户IP数/设备数刚好达到限制后，想切换 IP/设备使用时，大约需要等待的时间

### 我有多个面板/多种后端，需要安装多个 redis 吗

> 不需要，redis 默认配置下有 16 个数据库编号可以使用，编号分别是 0-15，将编号分开即可。
