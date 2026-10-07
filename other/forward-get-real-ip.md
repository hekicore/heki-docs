# 中转获取真实 IP 教程

## 当前支持范围

- `proxy_protocol=true`：适用于当前走 heki TCP listener 的入口，常见为 `tcp` / `ws` / `httpupgrade` / `h2` / `grpc` 这类基于 TCP 的入站；`Naive` 的内置 HTTP/2 server 和 `Mieru TCP` 也支持该开关
- `udp_proxy_protocol=true`：`SS` / `SSR` 的 UDP relay、以及 `Mieru UDP` 支持 Proxy Protocol v2，可识别真实源地址并按真实回包路径建立关联
- 如果只是普通 UDP 转发、前置不发送 UDP Proxy Protocol v2，那么后端仍拿不到真实 IP
- `Hysteria2`、`TUIC`，以及当前由内置 `splithttp/xhttp`、SS `gost quic`、SS `kcp/tcpraw` 专用传输接管的入口，不属于本页这套 Proxy Protocol 方案的支持范围

## proxy protocol 注意事项

!> 由于 proxy protocol 是明文协议，近期发现存在针对 proxy protocol 的`网络中间人攻击`，表现为即使发送了 proxy protocol，另一端却获取不到，或者另一端获取到的 IP 完全不正确

!> 如果遇到了上述情况，解决方式是`不要使用直连`方式转发真实 IP，使用加密隧道中转

## Mieru 中转真实 IP 配置

Mieru TCP 和 UDP 需要按传输方式开启不同开关。

TCP 节点：

```ini
server_type=mieru
mieru_transport=TCP
proxy_protocol=true
```

UDP 节点：

```ini
server_type=mieru
mieru_transport=UDP
udp_proxy_protocol=true
```

Mieru TCP 支持 Proxy Protocol v1 / v2；Mieru UDP 只接收 Proxy Protocol v2 DGRAM 头。如果开启 `force_proxy_protocol=true`，前置中转必须发送对应的 Proxy Protocol 头，否则连接或数据包会被拒绝。不开启 `proxy_protocol` / `udp_proxy_protocol` 时，Mieru 会保持原有直连行为。

## 专线转发注意事项
如果你购买了流量转发服务或者专线服务器，那么有可能无法获取真实 IP，需要注意以下情况

#### 1. 流量转发服务（无服务器）
由于`没有服务器控制权`，无法安装自己的转发软件，能否获取真实 IP 取决于商家是否支持`proxy protocol`转发

#### 2. 专线服务器（一台服务器，海外端控制权）
如果商家只提供`一台服务器`的控制权，通常是`海外端`服务器，商家会默认在`国内端`服务器使用`iptables`将流量转发至`海外端`服务器，由于`iptables`没有传递真实 IP 的功能，此时`海外端`服务器无法获取到用户真实 IP

如果商家不提供`国内端`服务器的控制权，那么只能再另外购买一台`国内服务器`，用户连接自己购买的`国内服务器`，再转发真实 IP 到`专线服务器`

#### 3. 专线服务器（一台服务器，国内端控制权）
如果商家提供`国内端服务器`的控制权，可以正常获取真实 IP

#### 4. 专线服务器（两台服务器）
如果能拿到`两台机器`的控制权，可以自行设置 iptables 转发

# 一、HAProxy 中转

## HAProxy 中转适合走 TCP 接入链路的入口

> 常见为 `VMess` / `VLESS` / `Trojan` / `SS` / `SSR` 的 `tcp` / `ws` 类场景，以及 `Mieru TCP`
>
> `HAProxy` 不处理 UDP，因此本节只对应 TCP 部分。若要让 `SS` / `SSR` 的 UDP relay 或 `Mieru UDP` 获取真实源地址，需要前置转发端支持并发送 `UDP Proxy Protocol v2`

## ① heki 配置

```
proxy_protocol=true
```

## ② 安装 HAProxy

**CentOS**

```
yum install haproxy -y
```

**Debian / Ubuntu**

```
apt install haproxy -y
```

## ③ 编辑 haproxy 配置文件

```
vim /etc/haproxy/haproxy.cfg
```

```
# 第一个中转
frontend frontend_1     # 名称随意，不要有相同的名字
  bind 0.0.0.0:12345    # 中转机监听端口
  mode tcp
  default_backend backend_1   # 要中转到哪个落地的名字
backend backend_1       # 落地名字，不要有相同的名字
  mode tcp
  server server1 hk.xxx.com:12345 send-proxy  # 填写落地的地址和端口，加上 send-proxy

# 第二个中转
frontend frontend_2
  bind 0.0.0.0:23456
  mode tcp
  default_backend backend_2
backend backend_2
  mode tcp
  server server2 jp.xxx.com:23456 send-proxy

# 可填写更多...
```

## ④ 重启 HAProxy

```
systemctl restart haproxy
systemctl enable haproxy
```

# 二、nginx 中转

> nginx 反代如果只设置 `X-Real-IP` / `X-Forwarded-For`，当前只适合 `splithttp/xhttp` 这类由 HTTP listener 读取转发头的入口；普通内置 `ws` / `httpupgrade` 入口不会把这些 HTTP 头转换成连接真实 IP。

示例：

```
location /wspath {
    proxy_pass http://后端IP或域名:后端监听端口/wspath;

    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```
