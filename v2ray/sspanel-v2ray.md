# SSPanel 对接 v2ray

> 使用 VMessAEAD 必看: [VMessAEAD 优化](other/vmess-aead.md)

# 同步时间（重要）

> v2ray 节点需要进行时间同步，时间若与客户端相差太大则无法连接

CentOS 7

```
yum install -y ntp
systemctl enable ntpd
ntpdate -q 0.rhel.pool.ntp.org
systemctl restart ntpd
```

Debian 9 / Ubuntu 16

```
apt-get install -y ntp
systemctl enable ntp
systemctl restart ntp
```

# 第一步，配置面板节点地址

- **假设有域名 hk.domain.com，根据具体示例开启或未开启 CDN，服务器 IP 为 1.3.5.7**
- path 参数需以 / 开头
- server 参数是显示给用户连接的地址，在开启 CDN 的情况下一定要填 CDN 域名，否则将无法使用 CDN
- NAT 时使用 inside_port，inside_port 表示节点内部监听的端口，当 NAT 商家提供给你的外部端口和你服务器监听的内部端口不一致时使用

## 节点地址格式：

```
IP;用户连接的端口;alterId;(tcp或ws);(tls或不填);path=/xxx|server=用户连接地址|host=伪装域名或tls域名
```

## tcp 示例，请注意 tcp 后面有两个分号

```
ip;12345;0;tcp;;server=用户连接地址
```

```
示例：1.3.5.7;12345;0;tcp;;server=hk.domain.com
```

## tcp + tls 示例

```
ip;12345;0;tcp;tls;server=用户连接地址|host=tls域名
```

``` 
示例：1.3.5.7;12345;0;tcp;tls;server=hk.domain.com|host=hk.domain.com
```

## ws 示例

```
ip;80;0;ws;;path=/xxx|server=用户连接地址|host=伪装域名
```

```
示例：1.3.5.7;80;0;ws;;path=/v2ray|server=hk.domain.com|host=hk.domain.com
```

## ws + tls 示例

```
ip;443;0;ws;tls;path=/xxx|server=用户连接地址|host=tls域名
```

```
示例：1.3.5.7;443;0;ws;tls;path=/v2ray|server=hk.domain.com|host=hk.domain.com
```

## 偏移端口 ws

> 当用户连接端口与程序监听端口不一致时使用，例如，中转机器连接端口与后端监听端口不同时

```
ip;监听端口;0;ws;;path=/xxx|server=用户连接地址|host=伪装域名|outside_port=用户连接端口
```

```
示例：1.3.5.7;80;0;ws;;path=/v2ray|server=gz.domain.com|host=hk.domain.com|outside_port=34567
```

## 偏移端口 ws + tls

```
ip;监听端口;0;ws;tls;path=/xxx|server=用户连接地址|host=tls域名|outside_port=用户连接端口
```

```
示例：1.3.5.7;443;0;ws;tls;path=/v2ray|server=gz.domain.com|host=hk.domain.com|outside_port=34567
```

# 第二步，配置 heki

!> 若启用 tls 则必须要配置证书！！！

参考: [heki 详细配置项](heki/heki-config.md)

# 第三步，启动 heki

```
heki start
```

若出现启动失败的情况，使用`heki log`查看错误信息
