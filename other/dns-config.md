# dns规则配置

# 自定义配置文件位置
多开实例下，需自定义配置文件位置时，使用程序参数`-d /etc/heki/dns.yml`指定

# 支持的后端类型

所有后端类型均支持

# dns 相关配置

| 参数名              | 默认值          | 说明                                                                    |
|------------------|--------------|-----------------------------------------------------------------------|
| `default_dns`    | 无            | 要使用的 dns 地址，以逗号分隔，支持域名 dns，支持自定义端口 (示例: 8.8.8.8:12345)，不填则使用系统 dns 解析 |
| `dns_cache_time` | `10`         | dns 缓存时间，单位分钟                                                         |
| `dns_strategy`   | `ipv4_first` | dns 解析策略，可选：`ipv4_first`、`ipv4_only`、`ipv6_first`、`ipv6_only`         |

# dns 地址格式
所有 dns 地址均支持以下格式，支持设置域名地址和非标准端口，以下是示例

## udp (默认 53 端口)
- 8.8.8.8
- dns.google
- 8.8.8.8:553

## tcp (默认 53 端口)
- tcp://8.8.8.8
- tcp://dns.google
- tcp://8.8.8.8:553

## domain over tls (默认 853 端口)
- tcp-tls://8.8.8.8
- tcp-tls://dns.google
- tcp-tls://8.8.8.8:8853

## domain over https (默认 443 端口)
- https://8.8.8.8/dns-query
- https://dns.google/dns-query
- https://8.8.8.8:4443/dns-query

# 规则匹配 dns

> 若使用 docker，需映射路径 -v /etc/heki/:/etc/heki/

配置 **/etc/heki/dns.yml**，以 yml 格式编辑，以下是配置示例：

> 域名规则的配置与[审计规则](other/block-list-config.md)一样

## 配置格式
```
# 若访问的域名满足以下三个规则中任意一个规则，那这个域名会优先使用配置的 dns 进行解析
# 若不满足，则会继续判断其它 dns 匹配规则
8.8.8.8:53,8.8.4.4,1.1.1.1:53,dns.google.com:       # 可配置多个 dns 地址，按顺序使用，以逗号分隔
  strategy: ipv4_first                               # 可选: ipv4_first (默认)、ipv6_first、ipv4_only、ipv6_only
  rules:                                            # 配置一个或多个域名匹配规则
    - geosite:netflix
    - domain:google.com
    - regexp:.*facebook\.com


# 配置多个 dns 匹配规则
1.2.3.4:
  strategy: ipv6_first
  rules:
    - geosite:facebook
```

# dns 优先级

`dns.yml` > `default_dns` > `系统 dns`

若域名不满足 dns.yml 中的所有规则，则会使用 default_dns 来进行解析，若 default_dns 为空或解析失败，则使用系统 dns 进行解析。
