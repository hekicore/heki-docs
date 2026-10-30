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
| `dns_rules_url` | 空 | 远程 `dns.yml` 的 HTTP(S) 原文地址；成功加载后替代本地规则 |
| `dns_rules_update_interval` | `60` | 远程刷新间隔，单位秒，正整数；未配置 URL 时不发起远程请求 |
| `default_dns`    | 无            | 要使用的 dns 地址，以逗号分隔，支持域名 dns，支持自定义端口 (示例: 8.8.8.8:12345)，不填则使用系统 dns 解析 |
| `dns_cache_time` | `10`         | dns 缓存时间，单位分钟                                                         |
| `dns_strategy`   | `ipv4_first` | dns 解析策略，可选：`ipv4_first`、`ipv4_only`、`ipv6_first`、`ipv6_only`         |

> 本地文件路径优先级是：CLI `-d` > `heki.conf` 中的 `dns_rules_file` > `heki.conf` 同目录默认 `dns.yml`。

# 远程统一管理

> 此功能随 2026-10-31 的 `v1.2.9` 同版本重发提供。旧版 1.2.9 用户需重新执行 `heki update 1.2.9`，或重新拉取 Docker 镜像并重建容器；仅查看版本号无法区分两次构建。

把一份 `dns.yml` 放到自己的 HTTPS 静态站点、对象存储或仓库原文地址，再让各服务器配置相同 URL。以后只需修改这一份文件，无需逐台修改，也无需重启 Heki。

在每台服务器的 `heki.conf` 中首次添加：

```ini
# 必须是直接返回 YAML 的原文地址，不是仓库网页、登录页或分享预览页
dns_rules_url=https://rules.example.com/dns.yml
# 秒；例如 60 表示每分钟检查一次，300 表示每 5 分钟
dns_rules_update_interval=60
# 可选：启动时远程不可用的本地兜底文件
dns_rules_file=/etc/heki/dns.yml
```

设置 URL 或修改刷新间隔后需要重启 Heki。`dns_rules_update_interval` 只接受正整数秒，不能写 `5m` 或 `0`；需要关闭远程读取时清空 `dns_rules_url` 并重启。这两项写在主配置或同名小写环境变量中，不属于节点文件 `[USER]` 覆盖项；同一实例下所有节点继承，并分别刷新。

远程文件仍使用现有的 DNS 规则格式，例如：

```yaml
# 替换为自己实际可用的解锁 DNS。一个 DNS 地址只写一次，规则合并到同一个列表。
"192.0.2.53:53":
  strategy: ipv4_first
  rules:
    - geosite:netflix
    - geosite:disney
    - geosite:openai
    - domain:chatgpt.com

# 其他需要单独指定 DNS 的域名
"1.1.1.1,8.8.8.8":
  - domain:example.com
```

`192.0.2.53` 是示例占位地址，部署时必须替换。未匹配的域名继续使用 `default_dns` 或系统 DNS。只填写 DNS 地址却不写规则是无效的远程配置；每组必须有非空规则列表。需要让一组匹配所有域名时使用带引号的 `"*"`，并放在远程文件最后。

Docker Compose 可在现有服务的 `environment` 中增加：

```yaml
environment:
  dns_rules_url: "https://rules.example.com/dns.yml"
  dns_rules_update_interval: "60"
  dns_rules_file: "/etc/heki/dns.yml"
```

执行 `docker compose up -d` 使环境变量生效；仅执行 `docker restart` 不会更新容器环境变量。本地兜底文件需要挂载到容器对应路径。之后仅修改远程 YAML，不需要重建容器。

## 刷新与故障行为

| 情况 | 行为 |
|---|---|
| 未配置 URL | 保持原有本地模式，每 10 秒检查文件变化 |
| 配置 URL 后启动 | 立即拉取一次，之后按间隔刷新；单次请求最多 15 秒 |
| 首次远程请求失败 | 使用本地 `dns_rules_file`，期间仍可自动重载本地文件；远程恢复后自动切换 |
| 远程成功后 | 使用整份远程规则替代本地规则，不合并；本地文件变更不会覆盖正在使用的远程规则 |
| HTTP 错误、超时、YAML 或规则格式错误 | 拒绝整次更新，继续使用当前有效规则，下一个周期重试 |
| 文件没变化 | 支持 ETag / Last-Modified 条件请求；内容相同时也不重建规则、不清 DNS 缓存 |
| 文件有效且有变化 | 完整校验后一次性切换，清理旧规则的 DNS 查询缓存；已有连接不因此断开 |
| 需要清空远程规则 | 发布显式空映射 `{}`；空响应或仅注释的文件视为异常，不会清空规则 |

远程文件最大 4 MiB，需为单份 YAML 文档；不支持的规则类型、重复 DNS 键、错误正则或拼错的字段会导致整份文件被拒绝。DNS 地址必须包含主机，显式端口必须在 `1-65535` 之间；例如只有 `tcp://`、写成 `1.1.1.1:70000`、或给普通 TCP DNS 地址添加 URL 路径，都会拒绝整次更新。格式校验不代表 DNS 服务一定可达，解析失败仍按下方优先级回退。

HTTPS 使用系统信任的证书校验。请求使用服务器的系统网络解析；下载地址本身需能从节点直接访问。若前面有 CDN，生效时间还取决于 CDN 缓存，请同步设置合理的缓存或刷新策略。

上一份远程规则只保存在运行内存，不写回本地 `dns.yml`；重启时若远程仍不可用，会重新使用本地兜底文件。本地文件也没有可用规则时，仍按面板 DNS、`default_dns`、系统 DNS 的原有逻辑处理。建议保留一份可用的本地兜底配置。

日志中的 `DNS rules: loaded ... from remote source` 表示更新已应用；`remote refresh failed, keeping current rules` 表示本次更新失败，旧规则仍在使用。

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

- 远程规则按文件中的先后顺序检查条目，命中第一条后使用该条目中的 DNS 列表按顺序尝试解析；本地旧解析器不保证多个 DNS 条目的顺序，应避免不同条目匹配同一域名
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
# 同一解锁 DNS 的域名合并到一组，避免 YAML 重复键
154.12.177.22:
  strategy: ipv4_first
  rules:
    - geosite:netflix
    - geosite:disney
    - geosite:openai
    - domain:chatgpt.com
```

# dns 优先级

`dns.yml` > `default_dns` > `系统 dns`

若域名不满足 `dns.yml` 中的所有规则，则会使用 `default_dns` 来进行解析；若 `default_dns` 为空或解析失败，则使用系统 DNS 进行解析。

如果面板下发了运行时 DNS 规则，则面板规则会排在当前 DNS 规则源前面：`面板运行时 DNS` > `当前 DNS 规则源` > `default_dns` > `系统 DNS`。

当前规则源默认是本地 `dns.yml`。配置 `dns_rules_url` 且成功加载后切换为远程规则；本地文件仅在尚未成功加载远程规则时兜底。`-d` 只决定本地文件路径，不会覆盖已经生效的远程规则。
