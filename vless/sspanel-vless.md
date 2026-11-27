# SSPanel 对接 vless

需要 SSPanel-UIM 26.1.0 或更新版本。面板没有单独的 VLESS 节点类型，而是在 `Vmess` 节点的自定义配置里写 `enable_vless`，从 26.1.0 起这类节点在订阅里导出为 VLESS。

!> 面板低于 26.1.0 时，`enable_vless` 节点在订阅里仍是 VMess。Heki 会按面板版本判断：旧版面板下继续提供 VMess 并在日志提示，不会切到 VLESS 让客户端连不上。

## 第一步，在面板添加节点

节点类型选 `Vmess`，自定义配置示例（Reality + Vision）：

```json
{
  "enable_vless": "1",
  "enable_reality": true,
  "security": "reality",
  "network": "tcp",
  "flow": "xtls-rprx-vision",
  "offset_port_node": "443",
  "offset_port_user": "443",
  "reality-opts": {
    "dest": "www.example.com:443",
    "server_names": ["www.example.com"],
    "private_key": "REPLACE_WITH_X25519_PRIVATE_KEY",
    "short_ids": ["0123456789abcdef"]
  }
}
```

| 字段 | 说明 |
|---|---|
| `enable_vless` | 只有 `1`、`"1"`、`true` 生效，与面板一致 |
| `enable_reality` | 必须是 JSON 布尔值 `true`；此时使用 `reality-opts` 里的私钥、`server_names`、`short_ids`、`dest` |
| `security` | `tls`（或旧写法 `xtls`）为普通 TLS，需要证书；`none` 为不加密 |
| `network` | `tcp`（`raw` 同义）、`ws`、`grpc`、`httpupgrade`、`xhttp` |
| `flow` | 只支持 `xtls-rprx-vision`，且要求 `tcp` + TLS 或 Reality |
| `host` / `path` / `servicename` | ws / httpupgrade / xhttp 的 Host 与路径，grpc 的服务名 |
| `offset_port_node` | 节点监听端口；`offset_port_user` 只写进订阅 |
| `reality_x25519mlkem768` | 客户端侧开关，Heki 同时接受 X25519 和混合密钥交换，不需要对应配置 |

用户 ID 是面板用户的 UUID。

## 第二步，配置 Heki

```ini
type=sspanel-uim
server_type=vless
panel_url=https://your-sspanel.com
panel_key=your-mu-key
node_id=1
```

`security=tls` 时需要证书，参考: [heki 详细配置项](heki/heki-config.md)。Reality 不需要证书。

## 第三步，启动 Heki

```
heki start
```

若出现启动失败的情况，使用`heki log`查看错误信息
