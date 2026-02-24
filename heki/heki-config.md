  # heki 安装与配置

## 一键脚本安装
```
# 自动安装&更新最新版
bash <(curl -Ls https://raw.githubusercontent.com/hekicore/heki/master/install.sh)

# 安装指定版本
bash <(curl -Ls https://raw.githubusercontent.com/hekicore/heki/master/install.sh) x.x.x
```

### heki 管理命令
```
heki                    - 显示管理菜单 (功能更多)
heki start              - 启动 heki
heki stop               - 停止 heki
heki restart            - 重启 heki
heki enable             - 设置 heki 开机自启
heki disable            - 取消 heki 开机自启
heki log                - 查看 heki 日志
heki status             - 查看 heki 状态
heki config             - 显示配置文件内容
heki config xx=xx yy=yy - 自动设置配置文件
heki update             - 更新 heki 最新版
heki update x.x.x       - 安装 heki 指定版本
heki install            - 安装 heki
heki uninstall          - 卸载 heki
heki version            - 查看 heki 版本
heki setup              - 交互式配置引导
heki modify             - 交互式修改配置
heki node list          - 查看当前节点
heki node add <ID>      - 添加节点
heki node del <ID>      - 删除节点
heki cert               - 证书管理
heki reality            - Reality 密钥管理
heki reality gen        - 自动生成 x25519 密钥对
heki x25519             - 生成 x25519 密钥对
```

### ① 使用 heki 命令自动配置
输出当前配置文件内容
```
heki config
```

自动配置`/etc/heki/heki.conf`，可填写`任意数量`的配置信息，示例：
```
heki config type=xboard node_id=1 heki_key=xxx panel_url=https://xxx.com/ panel_key=xxx
```

### ② 手动编辑配置文件
直接编辑`/etc/heki/heki.conf`文件，每行一个配置，以下为示例:

!> 建议直接在 Linux 下进行编辑，`不要在 Windows 下进行编辑`，否则可能会有 Windows 换行符`\r\n`导致的各种奇怪问题

```
type=xboard
node_id=1
heki_key=xxx

# webapi 对接
panel_url=https://xxx.com/
panel_key=xxxx

# 其他配置可自行添加
```

!> heki 会自动从面板获取协议类型（server_type），无需手动配置

## docker 安装
参考: [docker 对接教程](docker/docker-tutorial.md)

---

# 基础配置（必填）

| 参数名         | 默认值           | 说明                                                        |
|-------------|---------------|-----------------------------------------------------------|
| `type`      | `sspanel-uim` | 面板类型，可选: `sspanel-uim`,`xboard`,`v2board`,`xiaov2board`   |
| `node_id`   | 无             | 节点 id，可配置多个，以逗号分隔: `1,2,3`，每个节点必须是相同的后端类型                 |
| `heki_key`  | 无             | 授权码                                                       |

!> heki 会自动从面板的 sort 字段检测协议类型，无需手动配置 `server_type`。如需手动指定，可设置 `server_type`，可选: `v2ray`,`trojan`,`ss`,`ssr`,`vless`,`hysteria`,`anytls`,`naive`,`mieru`

# 对接配置（必填）

| 参数名                  | 默认值 | 说明                                                |
|----------------------|-----|---------------------------------------------------|
| `panel_url`          | 无   | 面板 webapi 地址，一般就是主页地址（兼容 `webapi_url`）             |
| `panel_key`          | 无   | webapi 通信密钥（兼容 `webapi_key`）                       |
| `xboard_api_version` | `2` | xboard API 版本，可选 `1` 或 `2`，默认 `2`                 |

# dns 配置（可选）

> 更多 dns 高级配置，例如流媒体解锁等：[dns 规则配置](other/dns-config.md)

| 参数名              | 默认值          | 说明                                                            |
|------------------|--------------|---------------------------------------------------------------|
| `default_dns`    | 无            | 要使用的 dns 地址，以逗号分隔，也支持域名 dns，不填则使用系统 dns 解析                    |
| `dns_cache_time` | `10`         | dns 缓存时间，单位分钟                                                 |
| `dns_strategy`   | `ipv4_first` | dns 解析策略，可选：`ipv4_first`、`ipv4_only`、`ipv6_first`、`ipv6_only` |

# v2ray 特殊配置（可选）

| 参数名                                        | 默认值     | 说明                                                                          |
|--------------------------------------------|---------|-----------------------------------------------------------------------------|
| `v2ray_reduce_memory`                      | `false` | VMessMd5 下有效，大幅降低内存使用，启用后客户端时间误差建议不超过15秒，最多不超过25秒                           |
| `v2ray_fallback_addr`                      | 无       | v2ray 回落地址，vless+tcp+tls 或 vmess+tcp+tls 下有效，若开启，则同时需设置 `tls_alpn=http/1.1` |
| `v2ray_fallback_port`                      | 无       | v2ray 回落端口，vless+tcp+tls 或 vmess+tcp+tls 下有效                                |
| `force_vmess_aead`                         | `false` | 是否强制启用 VMessAEAD，强制启用后，alterId 将被忽略，用户只能使用 VMessAEAD 进行连接                   |
| -                                          |         |                                                                             |
| `vmess_aead_invalid_access_enable`         | `false` | 是否启用错误密码攻击优化，详情参考: [VMessAEAD 优化](other/vmess-aead.md)                      |
| `vmess_aead_invalid_access_count`          | `30`    | 错误次数                                                                        |
| `vmess_aead_invalid_access_duration`       | `60`    | 错误次数统计时间，单位秒                                                                |
| `vmess_aead_invalid_access_forbidden_time` | `600`   | 禁用时间，单位秒                                                                    |

# trojan 特殊配置（可选）

| 参数名                  | 默认值 | 说明                                         |
|----------------------|-----|--------------------------------------------|
| `trojan_remote_addr` | 无   | trojan 回落地址，若开启，则同时需设置 `tls_alpn=http/1.1` |
| `trojan_remote_port` | 无   | trojan 回落端口                                |

# ss 密码单端口特殊配置（可选）
> 详情参考: [ss 密码单端口优化](other/ss-aead.md)

| 参数名                                | 默认值     | 说明           |
|------------------------------------|---------|--------------|
| `ss_invalid_access_enable`         | `false` | 是否启用错误密码攻击优化 |
| `ss_invalid_access_count`          | `30`    | 错误次数         |
| `ss_invalid_access_duration`       | `60`    | 错误次数统计时间，单位秒 |
| `ss_invalid_access_forbidden_time` | `600`   | 禁用时间，单位秒     |

# ss 密码单端口 obfs 配置 (可选)
| 参数名            | 默认值       | 说明                                                                                                                                                                         |
|----------------|-----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `ss_obfs_mode` | `relaxed` | 可选值: `relaxed`、`strict`、`strict_path`、`strict_host`。当设置为`strict`时，客户端的 path 与 host 必须与服务端一致才可连接，`strict_path`或`strict_host`则表示只检查 path 或 host，设置为`relaxed`则不做检查 |

# anytls 配置（可选）

| 参数名               | 默认值 | 说明              |
|-------------------|-----|-----------------|
| `anytls_sni`      | 无   | AnyTLS SNI 域名   |
| `anytls_cert_file`| 无   | AnyTLS 证书文件路径   |
| `anytls_key_file` | 无   | AnyTLS 密钥文件路径   |

# naive 配置（可选）

| 参数名                | 默认值    | 说明                                    |
|--------------------|--------|---------------------------------------|
| `naive_enable_tls` | `true` | 是否启用 TLS，Naive 协议默认需要 TLS              |
| `naive_cert_file`  | 无      | Naive TLS 证书文件路径                       |
| `naive_key_file`   | 无      | Naive TLS 密钥文件路径                       |
| `naive_server_name`| 无      | Naive TLS SNI 域名                       |

# mieru 配置（可选）

| 参数名                  | 默认值                | 说明                                                    |
|----------------------|--------------------|---------------------------------------------------------|
| `mieru_transport`    | `TCP`              | Mieru 传输协议，可选: `TCP`、`UDP`                              |
| `mieru_multiplexing` | `MULTIPLEXING_LOW` | Mieru 多路复用级别                                            |

# tls 配置（可选）

| 参数名                               | 默认值           | 说明                                                                             |
|-----------------------------------|---------------|--------------------------------------------------------------------------------|
| `tls_alpn`                        | `h2,http/1.1` | TLS ALPN 配置，不懂的话保持默认即可，多协议以逗号分隔                                                |
| `tls_min_version`                 | 空             | tls 最低版本，可选：`1.0`，`1.1`，`1.2`，`1.3`                                            |
| `tls_max_version`                 | 空             | tls 最高版本，可选：`1.0`，`1.1`，`1.2`，`1.3`                                            |
| `tls_prefer_server_cipher_suites` | `true`        | 如果为 true 则为使用服务器的最优选的密码套件                                                      |
| `tls_cipher_suites`               | 空             | 配置加密套件，参考 [tls 加密套件配置](other/tls-cipher-suites.md)                             |

# proxy_protocol 配置（可选）

> 详情参考：[中转获取真实 IP](other/forward-get-real-ip.md)

| 参数名                    | 默认值     | 说明                                                                                                 |
|------------------------|---------|----------------------------------------------------------------------------------------------------|
| `proxy_protocol`       | `false` | 是否启用 proxy protocol，[请参考这里](other/forward-get-real-ip.md)                                          |
| `udp_proxy_protocol`   | `false` | 是否接收 udp 数据包 proxy protocol 头，`ss&ssr`可使用，其他`udp over tcp`协议无需使用                                   |
| `force_proxy_protocol` | `false` | 启用`proxy_protocol`或`udp_proxy_protocol`后是否强制其接收 proxy protocol 协议，若开启，则必须使用 proxy protocol 中转，无法直连 |

# 增强限制用户 IP 数/设备数（可选）

> 详情查看介绍：[查看](other/limit-ip-and-device-num.md)

| 参数名                 | 默认值     | 说明                           |
|---------------------|---------|------------------------------|
| `redis_enable`      | `false` | 是否开启 redis 缓存                |
| `redis_addr`        | 无       | redis 地址，格式: `aaa.com:12345` |
| `redis_password`    | 无       | redis 密码                     |
| `redis_db`          | `0`     | redis 数据库编号，默认 0，无需更改        |
| `conn_limit_expiry` | `60`    | 缓存在线 IP 的时间，单位：秒             |

# 动态限速相关配置（可选）

> 详情查看介绍：[查看](other/dy-limit.md)

| 参数名                      | 默认值     | 说明                                             |
|--------------------------|---------|------------------------------------------------|
| `dy_limit_enable`        | `false` | 动态限速总开关                                        |
| `dy_limit_duration`      | 无       | 设置启用限速的时间段，留空表示全天限速                            |
| `dy_limit_trigger_time`  | `60`    | 触发限速时间，秒                                       |
| `dy_limit_trigger_speed` | `100`   | 触发限速阈值，Mbps                                    |
| `dy_limit_speed`         | `30`    | 触发限速后的限速值，Mbps                                 |
| `dy_limit_time`          | `600`   | 触发限速后的限速时间，秒                                   |
| `dy_limit_white_user_id` | 无       | 动态限速用户白名单，填写用户id，以`,`分隔多个用户id，在白名单的用户永远不会被动态限速 |

# 多路由多出口负载均衡配置（可选）

> 详情查看：[查看](other/routes-config.md)

| 参数名          | 默认值 | 说明                                                   |
|--------------|-----|------------------------------------------------------|
| `routes_url` | 无   | 从 url 中加载路由配置，并自动更新，更新间隔为 1 分钟。留空则从本地文件加载             |

# 审计规则配置（可选）

> 详情查看：[查看](other/block-list-config.md)

| 参数名              | 默认值 | 说明                                                    |
|------------------|-----|-------------------------------------------------------|
| `block_list_url` | 无   | 从 url 中加载审计规则配置，并自动更新，更新间隔与`check_interval`相同。留空则从本地文件加载 |

# 白名单规则配置（可选）

> 详情查看：[查看](other/white-list.md)

| 参数名              | 默认值 | 说明                                                     |
|------------------|-----|--------------------------------------------------------|
| `white_list_url` | 无   | 从 url 中加载白名单规则配置，并自动更新，更新间隔与`check_interval`相同。留空则从本地文件加载 |

# 用户 IP 缓存配置（可选）

> ss 密码单端口查看：[ss 密码单端口优化](other/ss-aead.md)
> 
> VMessAEAD 查看：[VMessAEAD 优化](other/vmess-aead.md)

| 参数名                         | 默认值          | 说明                                    |
|-----------------------------|--------------|---------------------------------------|
| `ip_user_cache_time`        | `24`         | 用户 IP 缓存时间，单位: 小时                     |
| `ip_user_cache_save_enable` | `true`       | 用户 IP 缓存是否自动保存到硬盘，可有效解决重启后缓存丢失的问题，建议开启 |
| `ip_user_cache_save_dir`    | `/etc/heki/` | 用户 IP 缓存保存文件夹                         |

# 网络配置（可选）

| 参数名           | 默认值     | 说明                                                                                                        |
|---------------|---------|-----------------------------------------------------------------------------------------------------------|
| `listen`      | 无       | 要监听的 IP 地址，不填写则监听所有`ipv4+ipv6`地址(`[::]`)，如果填写`all`表示独立监听每一个网卡 IP 地址，也可手动填写要监听的 IP，以逗号分隔：`1.2.3.4,2.3.4.5` |
| `tcp_timeout` | `120`   | 空闲 tcp 连接超时时间，单位: 分钟，设置 0 表示不超时                                                                          |
| `udp_timeout` | `2`     | 空闲 udp 连接超时时间，单位: 分钟，设置必须大于 0                                                                            |
| `mptcp`       | `false` | 是否开启监听 MPTCP，注意，此开关只表示开启，实际效果取决于网络和系统是否支持，请自行学习使用 MPTCP                                                  |

# geo 文件配置（可选）
| 参数名                   | 默认值                                                                               | 说明                                             |
|-----------------------|-----------------------------------------------------------------------------------|------------------------------------------------|
| `geo_update_enable`   | `false`                                                                           | 是否启用 geosite.dat 和 geoip.dat 文件自动更新             |
| `geo_update_interval` | `24`                                                                              | geosite.dat 和 geoip.dat 文件更新间隔，单位: 小时           |
| `geo_site_url`        | `https://github.com/v2fly/domain-list-community/releases/latest/download/dlc.dat` | geosite.dat 文件下载地址                              |
| `geo_ip_url`          | `https://github.com/v2fly/geoip/releases/latest/download/geoip.dat`               | geoip.dat 文件下载地址                                |

# 用户相关配置（可选）
| 参数名                            | 默认值   | 说明                                                                                                                   |
|--------------------------------|-------|----------------------------------------------------------------------------------------------------------------------|
| `user_conn_limit`              | `0`   | 限制每名用户正在使用的 IP 数，达到限制后该用户无法使用新的 IP 进行连接，0 表示不限制，若面板也下发相同功能的参数，则取两者的最低限制                                              |
| `user_tcp_limit`               | `0`   | 限制每名用户正在使用的 tcp 连接数，达到限制后该用户无法建立新的 tcp 连接，0 表示不限制                                                                    |
| `user_speed_limit`             | `0`   | 用户限速，单位 Mbps，0 为不限制，若面板也下发相同功能的参数，则取两者的最低限制                                                                          |
| `node_speed_limit`             | `0`   | 节点总限速，单位 Mbps，0 为不限速，若面板也下发相同功能的参数，则取两者的最低限制                                                                         |
| `user_ip_limit_cidr_prefix_v4` | `32`  | 设置用户 ipv4 cidr 前缀值，假设设置为`24`，当用户使用`192.168.1.0/24`下的任意 ip 进行访问，都将被视为同一 ip`192.168.1.0`，上报 ip 也将只上报`192.168.1.0`      |
| `user_ip_limit_cidr_prefix_v6` | `128` | 设置用户 ipv6 cidr 前缀值，具体作用同上                                                                                            |

# SSR 混淆单端口配置（可选）

| 参数名           | 默认值              | 说明                            |
|---------------|------------------|-------------------------------|
| `mu_suffix`   | `microsoft.com`  | 需和面板配置相同，默认无需修改               |
| `mu_regex`    | `%5m%id.%suffix` | 需和面板配置相同，默认无需修改               |
| `ss_obfs_udp` | `false`          | 是否开启混淆单端口 udp，注意无法统计用户 udp 流量 |

# SSR 协议单端口配置（可选）

| 参数名             | 默认值    | 说明                                          |
|-----------------|--------|---------------------------------------------|
| `ssr_cid_limit` | `true` | 是否开启设备数限制的功能，若关闭，则使用 IP 数限制，仅 ssr 协议单端口支持此项 |

# 证书配置参数

> `若开启 tls，则必须配置证书`
>
> heki 支持三种方式配置证书，`任选其一`即可

## ① 自定义证书文件路径

| 参数名         | 默认值 | 说明     |
|-------------|-----|--------|
| `cert_file` | 无   | 证书文件路径 |
| `key_file`  | 无   | 密钥文件路径 |

## ② http 验证自动申请证书

- 申请证书时需要`临时占用 80 端口`
- 确保域名已解析到本服务器的 IP，并且已`完全生效`
- 若申请证书的域名开启 CDN，则必须确保 CDN 不会跳转 https，否则推荐 dns 验证

| 参数名               | 默认值 | 说明                                           |
|-------------------|-----|----------------------------------------------|
| `cert_domain`     | 无   | 域名                                           |
| `cert_mode`       | 无   | 必填: `http`                                   |
| `cert_key_length` | 无   | 留空则申请 RSA 证书，填写 `ec-256` 或 `ec-384` 则申请ECC证书 |

## ③ dns 验证自动申请证书

- 支持一百多种 DNS 服务商
- 此配置方式较复杂，但最通用

| 参数名               | 默认值 | 说明                                 |
|-------------------|-----|------------------------------------|
| `cert_domain`     | 无   | 域名                                 |
| `cert_mode`       | 无   | 必填:dns                             |
| `cert_key_length` | 无   | 留空则申请RSA证书，填写ec-256或ec-384则申请ECC证书 |
| `dns_provider`    | 无   | DNS服务商名称                           |
| `DNS_xxx`         | 无   | 需要配置的邮箱、密钥等                        |

### CloudFlare 配置示例
```
cert_domain=xxx.com
cert_mode=dns
cert_key_length=ec-256
dns_provider=dns_cf

DNS_CF_Email=xxx@xx.com
# 此处填写 CloudFlare Global Key
DNS_CF_Key=xxxxx
```

### DNSPod 配置示例
```
cert_domain=xxx.com
cert_mode=dns
cert_key_length=ec-256
dns_provider=dns_dp

DNS_DP_Id=111
DNS_DP_Key=xxxxx
```

其它的 DNS 服务商都能在这个页面找到：https://github.com/acmesh-official/acme.sh/wiki/dnsapi

配置要点：

- 搜索 DNS 提供商的名称，并找到命令中`--dns dns_xxx`的内容，这个`dns_xxx`就是你要填的，例如：`dns_cf`
- 再看 DNS 提供商所需要配置的内容，`区分大小写`，一般都是邮箱、API 密钥之类的，例如：`CF_Email`、`CF_Key` 等。加上 **DNS_** 前缀，则在 heki 配置中写为 `DNS_CF_Email`，`DNS_CF_Key`
- 配置正确后 heki 会自动使用 acme.sh 申请证书

# 其它杂项（可选）

| 参数名                           | 默认值             | 说明                                                                                                                                     |
|-------------------------------|-----------------|----------------------------------------------------------------------------------------------------------------------------------------|
| `check_interval`              | `60`            | 节点同步间隔时间，单位秒                                                                                                                           |
| `submit_interval`             | `60`            | 提交数据间隔时间，单位秒                                                                                                                           |
| `force_close_ssl`             | `false`         | 设为`true`可强制关闭 tls，便于使用其他工具反代 tls                                                                                                       |
| `forbidden_bit_torrent`       | `true`          | 禁止 BT 下载，此项并不是万能的，请使用其它方式辅助禁止 BT 下载，例如 iptables                                                                                        |
| `auto_update`                 | `false`         | 每天自动检查并更新稳定版，仅脚本安装的 heki 可以自动重启，docker 需手动重启                                                                                           |
| `log_level`                   | `info`          | 日志等级：`debug`，`info`，`warn`，`error`                                                                                                     |
| `log_file_dir`                | `/etc/heki/`    | 指定 heki 日志保存的文件夹，日志按天保存，每天 0 点自动生成当天的日志文件。设置为空或者`false`则不保存日志到文件，只输出到控制台                                                               |
| `log_file_retention_days`     | `7`             | 日志保存天数，超过天数的日志文件将自动删除，设置为 0 表示永久保存                                                                                                     |
| `auto_out_ip`                 | `false`         | 是否开启源进源出，在多 IP 机器上，自动识别入口 IP，并作为出口 IP 进行远程连接；需要和`listen`参数一起使用                                                                         |
| `domain_sniff`                | `tls,http,quic` | 主动探测域名的协议，设为空即不探测                                                                                                                      |
| `sniff_redirect`              | `false`         | 是否开启探测域名重解析，当开启后，若客户端只传 IP 地址给 heki，则尝试探测域名，如果探测出来域名则将此域名重新解析新的 IP 地址                                                                  |
| `forbidden_ports`             | 无               | 禁止代理的端口，支持单个端口和端口段的形式，以逗号分隔，例: `25,465,1-100,200`                                                                                      |
| `ban_private_ip`              | `false`         | 是否禁止代理内网 ip                                                                                                                            |
| `detect_packet`               | `false`         | 启用后使用<审计规则>中的<正则表达式>进行检测明文数据包（只检测每个连接的第一个数据包）                                                                                          |
| `detect_packet_max_len`       | `4096`          | detect_packet 最大检测长度（字节）                                                                                                               |
| `submit_alive_ip_min_traffic` | `0`             | 在线 IP 阈值流量，单位 KB，一个上报周期内，若用户使用的流量低于阈值，则不上报该用户的`在线 IP`                                                                                  |
| `submit_traffic_min_traffic`  | `0`             | 阈值流量，单位 KB，一个上报周期内，若用户使用的流量低于阈值，则不上报该用户的`流量数据`                                                                                        |
