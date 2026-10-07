# 白名单规则配置

## 自定义配置文件位置
本地白名单文件支持以下优先级：

- CLI `-w /path/to/whiteList`
- `heki.conf` 中配置 `white_list_file=/path/to/whiteList`
- 若都未配置，默认回退到 `heki.conf` 同目录下的 `whiteList`

## 配置文件自动重载
修改本地配置文件时，heki 会每 10 秒自动检测变更并重载规则，无需重启；新规则加载完成后会立即参与匹配

## 自定义 geosite.dat 或 geoip.dat
heki 内置 geosite.dat 与 geoip.dat，如有自定义需求，将 geosite.dat 和 geoip.dat 放入`/etc/heki/`文件夹中，重启 heki 即可

## 支持的后端类型

所有后端类型均支持

## 白名单规则运行逻辑

简单来讲，白名单优先级最高，访问的地址只要在白名单内则直接放行；即使同一个目标也命中了 `blockList`，最终仍以白名单放行为准

## 配置白名单规则

| 参数名              | 默认值 | 说明                                           |
|------------------|-----|----------------------------------------------|
| `white_list_file` | 同配置目录 `whiteList` | 本地白名单文件路径；CLI `-w` 优先，其次使用这里的配置 |
| `white_list_url` | 无   | 从 URL 中加载白名单规则配置，并自动更新；更新间隔与 `check_interval` 相同，留空则从本地文件加载 |

> 若使用 docker，需映射路径 -v /etc/heki/:/etc/heki/

> 本地文件路径优先级是：CLI `-w` > `heki.conf` 中的 `white_list_file` > `heki.conf` 同目录默认 `whiteList`。
>
> 配置了 `white_list_url` 后，该白名单规则将优先使用远程内容；本地 `white_list_file`（未配置时默认回退到 `whiteList`）不再作为这份白名单的加载来源。

默认配置文件在 `heki.conf` 同目录下的 `whiteList`，每行填写一个规则；若配置了 CLI `-w` 或 `white_list_file`，则按指定路径读取。

配置规则与审计规则完全相同: [参考](other/block-list-config.md)

## 仅白名单模式

若想控制用户只能访问白名单内的地址，可做如下配置:

`/etc/heki/blockList`
```
# 先用黑名单拒绝所有目标
port:1-65535
```

`/etc/heki/whiteList`
```
# 再用白名单放行你真正想允许访问的规则

...
```
