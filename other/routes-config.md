# 多路由多出口负载均衡

## 自定义配置文件位置
多开实例下，需自定义配置文件位置时，使用程序参数`-r /etc/heki/routes.toml`指定

## 配置文件自动重载
修改配置文件时，heki 会自动重载配置文件，无需重启 heki，待下次 webapi 同步时生效

## 远程加载配置文件
| 参数名          | 默认值 | 说明                                                   |
|--------------|-----|------------------------------------------------------|
| `routes_url` | 无   | 从 url 中加载路由配置，并自动更新，更新间隔为 1 分钟。留空则从本地文件加载             |

## 支持的代理出口

| 类型       | 详细说明                                         |
|----------|----------------------------------------------|
| direct   | 直连                                           |
| vmess    | tcp(tls)、ws(tls)、http(tls)、h2(tls)、grpc(tls) |
| trojan   | tls                                          |
| ss       | 大多数加密均支持，不支持插件                               |
| ssr      | 大多数加密、协议、混淆均支持                               |
| socks    | 带用户名和密码或不带均可                                 |
| http     | 带用户名和密码或不带均可                                 |
| redirect | 将用户访问的地址+端口重定向到指定的地址+端口                      |

>配置文件路径为`/etc/heki/routes.toml`，若不配置，则默认直连

## 配置详解
- `至少配置一个路由`
- 按路由顺序匹配访问的`域名/IP`，当遇到匹配的路由后，则使用该路由下的代理出口（`随机使用其中一个`）；若没有匹配的路由，则`直接关闭连接`

```
# 是否启用路由，若关闭则默认直连
enable=true

# 路由 1 匹配规则列表，与审计规则格式相同，只要满足任意一条规则即可匹配成功
[[routes]]
rules=[
"geosite:netflix",        # 匹配 geosite 规则
"domain:google.com",      # 匹配域名后缀
"geoip:cn",               # 匹配 geoip 规则
"ip:1.2.3.4/24",          # 匹配 ip 或 ip 段
"port:1000-2000",         # 匹配端口或端口段
"node_id:1,2,3",          # 匹配节点 id，以逗号分隔多个 id
]

[[routes.Outs]] # 路由 1 代理出口 1
listen=""
type="socks"
server="aaa.com"
port=12345
username="asd"
password="asd"

[[routes.Outs]] # 路由 1 代理出口 2
# 此处省略代理出口配置



# 路由 N，最后一个路由兜底，否则无法匹配剩余的域名/IP
[[routes]]
# "*" 表示匹配任何域名/IP
rules=["*"]

# 配置直连出口
[[routes.Outs]]
listen="" # 出口网卡 ip，不配置则由系统决定
type="direct"
```

### 代理出口配置

#### direct
```
listen="" # 出口网卡 ip，不配置则由系统决定
type="direct"
```

#### vmess
```
listen=""
type="vmess"
server="xxx.com"
port=12345
uuid="xxx"
alter_id=0
network="ws"    # 可选: tcp ws http h2 grpc
ws_path="/asd"
tls=true
sni="xxx.com"
skip_cert_verify=false
```

#### trojan
```
listen=""
type="trojan"
server="xxx.com"
port=12345
password="xxx"
sni="xxx.com"
skip_cert_verify=false
```

#### ss
```
listen=""
type="ss"
server="aaa.com"
port=12345
password="asdasd"
cipher="aes-128-gcm"
```

#### ssr
```
listen=""
type="ssr"
server="aaa.com"
port=12345
password="asdasd"
cipher="aes-128-gcm"
obfs="plain"
obfs_param=""
protocol="origin"
protocol_param=""
```

#### socks
```
listen=""
type="socks"
server="aaa.com"
port=12345
username=""
password=""
```

#### http
```
listen=""
type="http"
server="aaa.com"
port=12345
username=""
password=""
```

#### redirect 重定向

将用户访问的地址+端口重定向到指定的地址+端口

```
listen=""
type="redirect"
server="aaa.com"  # 重定向地址
port=12345        # 重定向端口，若设置为 0，则使用用户访问的端口
```
