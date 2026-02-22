# 中转获取真实 IP 教程

## ss & ssr 注意
ss & ssr 使用原生 udp 处理 udp 数据，若直接中转 udp，则后端不能获取 udp 的真实 ip

## proxy protocol 注意事项

!> 由于 proxy protocol 是明文协议，近期发现存在针对 proxy protocol 的`网络中间人攻击`，表现为即使发送了 proxy protocol，另一端却获取不到，或者另一端获取到的 IP 完全不正确

!> 如果遇到了上述情况，解决方式是`不要使用直连`方式转发真实 IP，使用加密隧道中转

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

## HAProxy 中转适合`VMess`、`VLESS`、`Trojan`等协议

> ss&ssr 由于监听原生 udp 端口，HAProxy 不支持 udp，若中转，则会丢失 udp 功能

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

> 不需要开启 proxy_protocol

使用 nginx 进行反代，适合 ws 或 ws+tls

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
