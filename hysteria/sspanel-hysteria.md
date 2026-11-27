# SSPanel 对接 hysteria2

需要 SSPanel-UIM 26.1.0 或更新版本，面板从这个版本开始有 Hysteria 2 节点类型。旧版面板没有该类型。

## 第一步，在面板添加节点

节点类型选 `Hysteria 2`，面板会填入一份自定义配置模板。常用字段：

```json
{
  "offset_port_node": "443",
  "offset_port_user": "443",
  "host": "hy.example.com",
  "allow_insecure": false,
  "hysteria2": {
    "version": 2,
    "finalmask": {
      "udp": [
        {"type": "salamander", "settings": {"password": "your-obfs-password"}}
      ],
      "quicParams": {"congestion": "bbr"}
    }
  }
}
```

| 字段 | Heki 的处理 |
|---|---|
| `offset_port_node` | 节点监听的 UDP 端口 |
| `offset_port_user` | 写进订阅的端口，Heki 不使用 |
| `host` | 证书域名 / SNI |
| `hysteria2.finalmask.udp` 里的 `salamander` | 启用 Salamander 混淆并使用其中的密码；没有这一项时关闭混淆，本地配置的 `hysteria_obfs_type` 也不再生效，以免和订阅不一致 |
| `quicParams.congestion` 为 `brutal`，并填了 `brutalUp` / `brutalDown` | 作为上下行带宽（Mbps）。`bbr`、`reno` 时不使用带宽值 |
| `portHopping` / `udphop` | Heki 只监听一个端口，不会修改防火墙。启用端口跳跃时需要自己把这段 UDP 端口转发到监听端口，启动日志会提示范围 |
| `masquerade` | 面板里的伪装设置不会应用，网站伪装用节点配置里的 `hysteria_masquerade`，见 [网站伪装](hysteria/masquerade.md) |
| 其他 `finalmask.udp` 类型（如 `noise`） | 不支持，忽略并在日志提示 |

用户密码是面板用户的 UUID。

## 第二步，配置 Heki

!> hysteria 必须配置证书。

```ini
type=sspanel-uim
server_type=hysteria
panel_url=https://your-sspanel.com
panel_key=your-mu-key
node_id=1
```

证书可以手动指定 `cert_file` / `key_file`，也可以用 `cert_domain` + `cert_mode` 自动申请，参考: [heki 详细配置项](heki/heki-config.md)

## 第三步，启动 Heki

```
heki start
```

若出现启动失败的情况，使用`heki log`查看错误信息

## 说明

- SSPanel-UIM 的 Hysteria 2 与 Heki 原有的 AnyTLS 对接都用节点类型编号 15。Heki 按自定义配置里是否有 `hysteria2` 对象区分，没有时仍按 AnyTLS 处理。
- Metron 面板的格式不同，不适用本页。
