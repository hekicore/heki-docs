# VMessAEAD 说明

`VMessAEAD` 是 v2ray-core v4.28 开始启用的新认证方式，与旧的 `VMessMD5` 不兼容。heki 目前默认保留双栈兼容，但在面板明确下发 `alterId>0` 时，会自动切到 `VMessMD5-only`，避免两种握手混跑。

当前推荐口径：

- 想让客户端稳定走 `VMessAEAD`：请在面板/订阅下发中**直接删除** `alterId` 字段，不要仅写 `alterId=0`
- 想兼容旧版 `VMessMD5`：请明确下发 `alterId>0`；当前 heki 会自动锁到 `VMessMD5-only`，如需手动固定也可以显式开启 `force_vmess_md5=true`

!> 按当前线上实测，`Clash/Mihomo` 等客户端只要订阅里仍保留 `alterId` 字段，哪怕值为 `0`，也可能继续发起 `aead=false` 的 legacy VMess 流量。

## 认证模式开关

heki 默认保留双栈兼容；但如果节点下发里明确带了 `alterId>0`，会自动切到 `VMessMD5-only`。如果需要手动固定认证模式，可以使用下面两个开关：

| 参数名 | 默认值 | 说明 |
|---|---|---|
| `force_vmess_aead` | `false` | 强制只允许 `VMessAEAD`；开启后会忽略 `alterId`，客户端只能使用 `VMessAEAD` 连接 |
| `force_vmess_md5` | `false` | 强制只允许旧版 `VMessMD5`；开启后会拒绝 `VMessAEAD`，适合兼容只支持 legacy md5 的客户端 |

注意：

- `force_vmess_aead` 和 `force_vmess_md5` 不能同时为 `true`
- 如果目标是纯 `VMessAEAD`，建议同时检查订阅输出，确认客户端拿到的节点配置里已经没有 `alterId` 字段
- `force_vmess_md5=true` 主要用于兼容老客户端，或你想在没有 `alterId` 自动判定时也手动锁到 legacy md5 的场景
- 如果没有明确兼容需求，建议优先输出不带 `alterId` 的订阅，或显式开启 `force_vmess_aead=true`

## 优点
相比较于`VMessMD5`，`VMessAEAD`不需要预先生成用户的认证信息，可以节省大量的内存空间

`VMessAEAD`比`VMessMD5`更安全，未来会成为主流

## 缺点
由于`VMessAEAD`不需要预先生成用户的认证信息，所以每次认证都需要遍历所有用户来进行用户认证，会导致认证时的 cpu 占用率明显上升

# heki 优化

heki 针对此种情况进行了深度优化，可以很大程度改善`VMessAEAD`认证方式的 cpu 占用率，基本让`VMessAEAD`与`VMessMD5`的性能处于同一量级

heki 还实现了 AuthenticatedLength 和 SessionHistory 安全增强，进一步提升 VMess 协议的安全性

## 真实 IP 缓存优化

只要让 heki 能`正确获取到用户真实 ip`，heki 会自动开启优化

如果用户直连 heki 服务端，则无需关心，此优化已开启

如果你使用了中转服务器，则需确保 heki `能正确获取到用户真实 ip`，详情参考: [这里](other/forward-get-real-ip.md)

### 相关配置

| 参数名                         | 默认值          | 说明                                    |
|-----------------------------|--------------|---------------------------------------|
| `ip_user_cache_time`        | `1`          | 用户 IP 缓存时间，单位: 小时                     |
| `ip_user_cache_save_enable` | `true`       | VMess 认证 IP 缓存是否自动保存到硬盘，可有效解决重启后缓存丢失的问题，建议开启 |
| `ip_user_cache_save_dir`    | `/etc/heki/` | 用户 IP 缓存保存文件夹                         |

## 全量遍历并发限制

当用户量很大时，首次对接或用户列表更新后，IP 缓存为空，所有连接都需要全量遍历用户密钥进行 AES-ECB / HMAC-MD5 认证匹配。如果此时有大量并发连接同时到达，CPU 会瞬间爆满。

heki 通过信号量机制限制同时进行全量遍历的连接数（默认最多 8 个），其余排队等待。IP 缓存命中后的连接不受此限制（O(1) 直接匹配）。

随着连接陆续命中缓存，几秒内即可恢复到稳态的低 CPU 状态。

!> 此优化为内置机制，无需额外配置。VMess Legacy MD5 认证的用户不会被缓存（仅 AEAD 用户缓存），但全量遍历仍受并发限制保护。

## 错误密码攻击优化

当用户使用错误的密码连接时，服务端`尝试所有的用户`进行`解密`数据包，最终抛出`未找到用户`的错误

每一个`错误密码`的 tcp 连接，都会让服务端`重复上述流程`，`极大增加`了服务器的 cpu 使用率，降低正常用户的体验

若这样的`错误密码`连接很多，例如攻击者`恶意攻击服务端`，服务器 cpu 占用率`直接爆满`，用户无法正常使用

### 配置
| 参数名                                         | 默认值     | 说明           |
|---------------------------------------------|---------|--------------|
| `vmess_aead_invalid_access_enable`          | `false` | 是否启用错误密码攻击优化 |
| `vmess_aead_invalid_access_count`           | `30`    | 错误次数         |
| `vmess_aead_invalid_access_duration`        | `60`    | 错误次数统计时间，单位秒 |
| `vmess_aead_invalid_access_forbidden_time`  | `600`   | 禁用时间，单位秒     |

### 功能描述

!> 此功能必须确保 heki `获取到真实 IP`，否则不要开启此功能，[中转获取真实IP](other/forward-get-real-ip.md)

!> 此功能仅针对`VMessAEAD`验证方式，若用户使用`VMessMD5`认证，则不受影响

!> `强烈建议`根据你的实际情况修改配置，默认配置`未经过任何实战`

!> 此功能有可能导致误伤正常用户，例如：用户`误操作`使用了错误的密码进行连接，`触发错误次数统计`导致被暂时封禁

以`默认配置`为例，当某个 IP 在`60`秒内`使用错误密码`尝试连接`30`次后，将会禁用此 IP`600`秒

在封禁期间，若此 IP 无论使用正确密码或错误密码连接，服务端均`直接关闭连接`，不会继续消耗服务器 cpu 进行尝试解密
