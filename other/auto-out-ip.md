# 源进源出（Auto Out IP）

## 功能说明

在多 IP 服务器上，`auto_out_ip` 功能可以自动识别用户连接的入口 IP，并使用相同的 IP 作为出口 IP 进行远程连接。

例如服务器有 3 个 IP：`1.1.1.1`、`2.2.2.2`、`3.3.3.3`，用户通过 `2.2.2.2` 连接到 heki，那么 heki 访问目标网站时也会使用 `2.2.2.2` 作为出口 IP。

## 配置参数

| 参数名          | 默认值     | 说明                                                                 |
|--------------|---------|----------------------------------------------------------------------|
| `auto_out_ip`| `false` | 是否开启源进源出，按入口本地 IP 绑定出口                                            |
| `listen`     | 无       | 可为空；但若希望多 IP、UDP、QUIC 场景也稳定按入口 IP 出口，建议显式配置具体监听 IP 或 `all` |

## 配置示例

### 监听所有网卡 IP

```
listen=all
auto_out_ip=true
```

`listen=all` 会自动检测服务器上所有非 loopback 网卡 IP 并分别监听。

在单节点场景下，这表示同一节点会实际绑定这些 IP。
在多节点场景下，`listen` 先表示“可用监听 IP 池”，再由 `multi_node_listen_strategy` 决定每个节点最终实际绑定哪些地址。

建议将其作为多 IP 服务器的通用配置。

### 手动指定监听 IP

```
listen=1.1.1.1,2.2.2.2,3.3.3.3
auto_out_ip=true
```

### 只开启 auto_out_ip

```
auto_out_ip=true
```

在多数 TCP 场景下该配置也可以生效，因为 heki 可以从已建立的 TCP 连接中获取实际入口本地 IP。

但对于多 IP 服务器，如果希望 UDP/QUIC 也稳定按入口 IP 出口，仍建议显式配置 `listen=all` 或具体 IP 列表。

如果服务器本身只有一个公网 IP，那么仅开启 `auto_out_ip=true` 与显式配置 `listen` 的差异通常不大。

## 工作原理

1. heki 根据 `listen` 配置，在每个 IP 上独立监听
2. 用户连接到某个 IP（如 `2.2.2.2:443`）
3. heki 识别到入口本地 IP 为 `2.2.2.2`
4. heki 建立出站连接时，绑定本地地址为 `2.2.2.2`
5. 目标网站看到的来源 IP 就是 `2.2.2.2`

## 支持的协议

源进源出已集成到所有代理协议中：

- VMess / VLESS
- Shadowsocks / ShadowsocksR
- Trojan
- AnyTLS
- Hysteria2（QUIC/UDP）
- TUIC（QUIC/UDP）
- Naive
- Mieru

## 注意事项

- 仅配置 `auto_out_ip=true` 仍可在部分场景生效。TCP 入口通常能够识别实际入口 IP；但如果监听的是通配地址（如留空、`0.0.0.0`、`::`），尤其在 UDP/QUIC 场景下，可能无法获得明确本地 IP，此时会回退到系统默认出口
- 只要 `listen=all` 或显式多 IP 最终展开成明确的 `ListenAddrs`，`Hysteria2 / TUIC / Mieru / Naive / SS UDP / SSR obfs UDP` 都会按这些地址逐个启动 listener，不会只使用第一条地址
- `Hysteria2 / TUIC` 会把各自 listener 的本地 IP 传给出站绑定逻辑；`Mieru` 会把这些地址显式写入官方 mux endpoint；`Naive / SS UDP / SSR obfs UDP` 也会在全部 `ListenAddrs` 上实际启动
- SS / SSR 的 UDP 现在也会把监听器本地地址传给出站绑定逻辑；只有在监听器本地地址本身是通配地址时，才会回退系统默认出口
- 如果同时配置了路由分流（`routes.toml`），优先级为 `routes.toml direct/listen` > `auto_out_ip` > `系统默认出口`
- 多 IP 服务器想稳定做到“哪个入口 IP 进来，就从哪个 IP 出去”，最稳妥的配置仍是显式写 `listen=all` 或具体 IP 列表
- 多节点模式下，`listen` 仍用于确定节点可用的监听 IP；默认 `multi_node_listen_strategy=auto` 只会在同端口节点之间自动分配这些地址，以避免监听冲突
- 如果多个节点监听端口不同，`auto` 会按端口分组分别从 `listen` 列表的第一个 IP 开始分配；如果你希望无论端口是否相同都固定按 `node_id` 顺序一节点一个 IP，请改用 `multi_node_listen_strategy=split` 或节点级 `listen_addr`
