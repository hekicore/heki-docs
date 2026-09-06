# dns规则配置

# 自定义配置文件位置
本地 DNS 规则文件支持以下优先级：

- CLI `-d /path/to/dns.yml`
- `heki.conf` 中配置 `dns_rules_file=/path/to/dns.yml`
- 若都未配置，默认回退到 `heki.conf` 同目录下的 `dns.yml`

# 支持的后端类型

所有后端类型均支持

# dns 相关配置

| 参数名              | 默认值          | 说明                                                                    |
|------------------|--------------|-----------------------------------------------------------------------|
| `dns_rules_file` | 同配置目录 `dns.yml` | 本地 DNS 规则文件路径；CLI `-d` 优先，其次使用这里的配置 |
| `default_dns`    | 无            | 要使用的 dns 地址，以逗号分隔，支持域名 dns，支持自定义端口 (示例: 8.8.8.8:12345)，不填则使用系统 dns 解析 |
| `dns_cache_time` | `10`         | dns 缓存时间，单位分钟                                                         |
| `dns_strategy`   | `ipv4_first` | dns 解析策略，可选：`ipv4_first`、`ipv4_only`、`ipv6_first`、`ipv6_only`         |

> 本地文件路径优先级是：CLI `-d` > `heki.conf` 中的 `dns_rules_file` > `heki.conf` 同目录默认 `dns.yml`。

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

默认配置文件为 `heki.conf` 同目录下的 `dns.yml`；若配置了 CLI `-d` 或 `dns_rules_file`，则按指定路径读取。以下是 yml 格式配置示例：

> `dns.yml` 只按`域名`匹配。它复用了同一套规则解析器，但实际生效的仅是域名类规则；`ip:`、`geoip:`、`port:`、`node_id:` 等审计/路由规则在这里不会参与匹配。

## 配置文件自动重载

修改 `dns.yml` 后无需重启 heki，heki 会每 10 秒自动检测本地文件变更并重新加载规则。

!> 若 `dns.yml` YAML 格式错误，该次热重载后的规则集会变为空，相关域名将回退到 `default_dns` 或系统 DNS；修正文件后会在下一次热重载恢复。

## 规则匹配行为

- 按 `dns.yml` 中的先后顺序检查条目，命中第一条后使用该条目中的 DNS 列表按顺序尝试解析
- 如果命中的这条规则里所有 DNS 都解析失败，不会继续匹配后续 `dns.yml` 条目，而是回退到 `default_dns` 或系统 DNS
- `dns.yml` 只影响命中的域名；如果你想让所有域名默认走某个 DNS，请配置 `default_dns`

## 配置格式
```yaml
# 若访问的域名满足以下三个规则中任意一个规则，那这个域名会优先使用配置的 dns 进行解析
# 若不满足，则会继续判断其它 dns 匹配规则
8.8.8.8:53,8.8.4.4,1.1.1.1:53,dns.google.com:       # 可配置多个 dns 地址，按顺序使用，以逗号分隔；默认端口 53，可自定义其他任意端口；可使用域名 dns 地址
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


# 也可以省略 strategy 和 rules 关键字，直接在 dns 地址下列出规则（效果相同，strategy 默认 ipv4_first）
1.1.1.1:
   - domain:youtube.com

# 可填写多个 dns 地址，表示备用 dns 地址，按顺序使用，以逗号分隔
1.1.1.1,2.2.2.2,3.3.3.3:
   - geosite:netflix

# 这是错误的写法。没有 rules 的条目不会对任何域名生效。
# 如果想让所有域名默认优先用 8.8.4.4，请配置 default_dns=8.8.4.4
8.8.4.4:
```

## 域名规则类型

| 规则类型 | 格式 | 说明 | 示例 |
|--------|------|------|------|
| 纯字符串 | `sina.com` | 子串匹配，匹配目标域名中任意部分 | `sina.com` 匹配 `sina.com`、`www.sina.com`、`sina.com.cn` |
| 域名后缀 | `domain:xxx` | 匹配域名及其所有子域名（推荐） | `domain:google.com` 匹配 `google.com`、`www.google.com` |
| 完整匹配 | `full:xxx` | 精确匹配完整域名 | `full:google.com` 只匹配 `google.com`，不匹配 `www.google.com` |
| 正则表达式 | `regexp:xxx` | 正则匹配 | `regexp:.*facebook\.com` |
| 预定义列表 | `geosite:xxx` | 使用 geosite.dat 中的域名列表 | `geosite:netflix`、`geosite:google`、`geosite:cn` |
| 通配所有域名 | `*` | 匹配所有域名，常用于“这一组 DNS 作为特殊默认规则” | `*` |

> geosite.dat 文件默认路径 `/etc/heki/geosite.dat`，名称及域名列表参考 [预定义域名列表](https://www.v2fly.org/config/routing.html#预定义域名列表)

## 流媒体解锁配置示例

使用解锁 DNS 解锁 Netflix、Disney+ 等流媒体：

```yaml
# 解锁 Netflix（使用解锁 DNS）
154.12.177.22:
  strategy: ipv4_first
  rules:
    - geosite:netflix

# 解锁 Disney+
154.12.177.22:
  strategy: ipv4_first
  rules:
    - geosite:disney

# 解锁 OpenAI / ChatGPT
154.12.177.22:
  strategy: ipv4_first
  rules:
    - geosite:openai
    - domain:chatgpt.com
```

# dns 优先级

`dns.yml` > `default_dns` > `系统 dns`

若域名不满足 `dns.yml` 中的所有规则，则会使用 `default_dns` 来进行解析；若 `default_dns` 为空或解析失败，则使用系统 DNS 进行解析。

如果面板下发了运行时 DNS 规则，则面板规则会排在本地 `dns.yml` 前面：`面板运行时 DNS` > `dns.yml` > `default_dns` > `系统 dns`。
