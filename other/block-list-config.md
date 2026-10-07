# 审计规则配置

## 自定义配置文件位置
本地审计规则文件支持以下优先级：

- CLI `-b /path/to/blockList`
- `heki.conf` 中配置 `block_list_file=/path/to/blockList`
- 若都未配置，默认回退到 `heki.conf` 同目录下的 `blockList`

## 配置文件自动重载
修改本地配置文件时，heki 会每 10 秒自动检测变更并重载规则，无需重启；新规则加载完成后会立即参与匹配

## 自定义 geosite.dat 或 geoip.dat
heki 内置 geosite.dat 与 geoip.dat，如有自定义需求，将 geosite.dat 和 geoip.dat 放入`/etc/heki/`文件夹中，重启 heki 即可

## 支持的后端类型

所有后端类型均支持

## 面板下发规则说明

`blockList` / `whiteList` 这套规则只从本地文件或 `block_list_url` / `white_list_url` 加载，不会自动从面板接口写入。

如果面板下发了 `routes` / `block` / `protocol` 这类规则，heki 会走运行时路由或协议拦截链路处理；这和本页的本地 `blockList` 不是同一个配置来源。

## 审计规则配置

| 参数名              | 默认值 | 说明                                          |
|------------------|-----|---------------------------------------------|
| `block_list_file` | 同配置目录 `blockList` | 本地审计规则文件路径；CLI `-b` 优先，其次使用这里的配置 |
| `block_list_url` | 无   | 从 URL 中加载审计规则配置，并自动更新；更新间隔与 `check_interval` 相同，留空则从本地文件加载 |

> 若使用 docker，需映射路径 -v /etc/heki/:/etc/heki/

> 本地文件路径优先级是：CLI `-b` > `heki.conf` 中的 `block_list_file` > `heki.conf` 同目录默认 `blockList`。
>
> 配置了 `block_list_url` 后，该黑名单规则将优先使用远程内容；本地 `block_list_file`（未配置时默认回退到 `blockList`）不再作为这份黑名单的加载来源。

默认配置文件在 `heki.conf` 同目录下的 `blockList`，每行填写一个规则；若配置了 CLI `-b` 或 `block_list_file`，则按指定路径读取。

配置规则如下：

- 纯字符串：当此字符串匹配目标域名中任意部分，该规则生效。比如`sina.com`可以匹配`sina.com`、`sina.com.cn`和`www.sina.com`，但不匹配`sina.cn`。
- 正则表达式：由 `regexp:` 开始，余下部分是一个正则表达式。当此正则表达式匹配目标域名时，该规则生效。例如`regexp:\\.goo.*\\.com`匹配`www.google.com`、`fonts.googleapis.com`，但不匹配`google.com`。
- 子域名（推荐）：由 `domain:` 开始，余下部分是一个域名。当此域名是目标域名或其子域名时，该规则生效。例如`domain:v2ray.com`匹配`www.v2ray.com`、`v2ray.com`，但不匹配`xv2ray.com`。
- 完整匹配：由 `full:` 开始，余下部分是一个域名。当此域名完整匹配目标域名时，该规则生效。例如`full:v2ray.com`匹配`v2ray.com`但不匹配`www.v2ray.com`。
- 预定义域名列表：由 `geosite:` 开头，余下部分是一个名称，如 `geosite:google` 或者 `geosite:cn`。
- ip：由`ip:`开头，余下部分是一个 ip 或 ip 段。例如：`ip:127.0.0.1`，`ip:192.168.0.0/16`。支持 ipv4 和 ipv6
- geoip：由`geoip:`开头，后面跟双字符国家或地区代码。例如：`geoip:cn`
- port：由`port:`开头，后面跟逗号分隔的端口或端口段。例如：`port:80,443,12345`，`port:1-1024,12345,23456,30000-50000`

以下是示例：

```
google                    # 屏蔽包含 "google" 字符串的域名

regexp:.*google\.com      # 屏蔽以 google.com 结尾的任何域名

domain:google.com         # 屏蔽 google.com 及 google.com 的任何子域名

full:google.com           # 只屏蔽 google.com 域名

geosite:google            # 屏蔽 google 相关的所有域名

ip:192.168.0.0/16         # 屏蔽 ip 段

geoip:cn                  # 屏蔽中国 ip

port:1-1024,12345,23456   # 屏蔽端口和端口段
```

## 补充说明

- 白名单优先级高于黑名单。若某个目标同时命中 `whiteList` 和 `blockList`，最终会放行
- `detect_packet=true` 时，审计规则中的`纯字符串`和`regexp:`还会用于检测明文首包内容；域名/IP/端口类规则仍按目标地址匹配
