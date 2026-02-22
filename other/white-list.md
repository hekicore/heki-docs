# 白名单规则配置

## 自定义配置文件位置
多开实例下，需自定义配置文件位置时，使用程序参数`-w /etc/heki/whiteList`指定

## 配置文件自动重载
修改配置文件时，heki 会自动重载配置文件，无需重启 heki，待下次 webapi 同步时生效

## 自定义 geosite.dat 或 geoip.dat
heki 内置 geosite.dat 与 geoip.dat，如有自定义需求，将 geosite.dat 和 geoip.dat 放入`/etc/heki/`文件夹中，重启 heki 即可

## 支持的后端类型

所有后端类型均支持

## 白名单规则运行逻辑

简单来讲，白名单优先级最高，访问的地址只要在白名单内则直接放行

## 配置白名单规则

| 参数名              | 默认值 | 说明                                           |
|------------------|-----|----------------------------------------------|
| `white_list_url` | 无   | 从 url 中加载白名单规则配置，并自动更新，留空则从本地文件加载             |

> 若使用 docker，需映射路径 -v /etc/heki/:/etc/heki/

配置文件在`/etc/heki/whiteList`，每行填写一个规则。

配置规则与审计规则完全相同: [参考](other/block-list-config.md)

## 仅白名单模式

若想控制用户只能访问白名单内的地址，可做如下配置:

`/etc/heki/blockList`
```
# 黑名单禁止所有地址访问
port:1-65535
```

`/etc/heki/whiteList`
```
# 白名单放行想要的规则

...
```
