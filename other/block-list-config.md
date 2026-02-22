# 审计规则配置

## 自定义配置文件位置
多开实例下，需自定义配置文件位置时，使用程序参数`-b /etc/heki/blockList`指定

## 配置文件自动重载
修改配置文件时，heki 会自动重载配置文件，无需重启 heki，待下次 webapi 同步时生效

## 自定义 geosite.dat 或 geoip.dat
heki 内置 geosite.dat 与 geoip.dat，如有自定义需求，将 geosite.dat 和 geoip.dat 放入`/etc/heki/`文件夹中，重启 heki 即可

## 支持的后端类型

所有后端类型均支持

## 面板审计规则

> heki 会自动从以下面板获取审计规则，修改审计规则后会在下次同步时自动更新审计规则

| 面板         |     |
|------------|-----|
| SSPanel    | ✅   |
| V2board    | ✅   |

## 审计规则配置

| 参数名              | 默认值 | 说明                                          |
|------------------|-----|---------------------------------------------|
| `block_list_url` | 无   | 从 url 中加载审计规则配置，并自动更新，留空则从本地文件加载             |

> 若使用 docker，需映射路径 -v /etc/heki/:/etc/heki/

配置文件在`/etc/heki/blockList`，每行填写一个规则。

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
