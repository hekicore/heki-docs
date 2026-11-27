# Hysteria2 ECH 配置

Hysteria2 支持服务端 ECH（Encrypted ClientHello）。服务端使用包含私钥的 `ECH server keys`，客户端使用与之配对的公开 `ECH config list`；两段 Base64 不能填反，也不能把服务端私钥放进客户端订阅。

ECH 不代替 TLS 证书验证，也不会生成节点证书。节点仍需配置有效证书，客户端仍需信任该证书。

## 生成配对材料

以下示例使用支持 `tls ech` 命令的 Xray。把 `public.example.com` 替换为要放在外层 ClientHello 中的公开名称：

```bash
xray tls ech --serverName public.example.com
```

命令输出两段 Base64：

| 输出 | 用途 | 是否可以发给客户端 |
|---|---|---|
| `ECH server keys` | Heki 服务端或面板服务端配置，包含私钥 | 否 |
| `ECH config list` | 与服务端配对的公开客户端配置 | 是 |

## 配置 Heki

在主配置 `heki.conf` 中设置 `hysteria_ech_server_keys`。证书路径仅为示例，须替换为实际已存在且相互匹配的证书和私钥：

```ini
cert_file=/etc/heki/certs/node.example.com.crt
key_file=/etc/heki/certs/node.example.com.key
hysteria_ech_server_keys=BASE64_ECH_SERVER_KEYS
```

把 `BASE64_ECH_SERVER_KEYS` 换成同一次命令输出的完整 `ECH server keys` 单行 Base64，不加引号。无效 keyset 会导致对应节点启动失败。

多节点需要不同 ECH 密钥时，把该键写入对应 `nodes/node_<ID>.conf` 的用户区：

```ini
[USER]
hysteria_ech_server_keys=BASE64_ECH_SERVER_KEYS
```

也可通过同名小写环境变量提供默认值：

```yaml
services:
  heki:
    environment:
      hysteria_ech_server_keys: "BASE64_ECH_SERVER_KEYS"
```

节点 `[USER]` 可以覆盖主配置提供的默认值；本地显式配置优先于面板下发的 ECH 材料。如果希望完全使用面板下发值，应移除节点、环境变量和主配置中的该项。面板只有提供包含私钥的 `ech_server_keys` / `ech_key` 时才能启用服务端 ECH；仅有 `ech_enable` 或客户端 `ech_config` 不足以启用。

修改主配置或节点配置后重启所属实例；修改 Docker 环境变量后重新创建容器。密钥变更后还要同步更新客户端的公开配置。

## 配置客户端

以下以 Mihomo v1.19.34 为例。把节点地址、端口、订阅密码和 `BASE64_ECH_CONFIG_LIST` 替换为实际值，并将节点合并到 `proxies` 列表：

```yaml
proxies:
  - name: heki-hy2-ech
    type: hysteria2
    server: node.example.com
    port: 443
    password: YOUR_SUBSCRIPTION_PASSWORD
    sni: node.example.com
    skip-cert-verify: false
    ech-opts:
      enable: true
      config: BASE64_ECH_CONFIG_LIST
```

- `config` 使用与服务器当前密钥配对的 `ECH config list`，不是 `ECH server keys`。
- `sni` 是加密后的真实节点名称，须匹配节点证书；公开名称已经包含在 ECH config list 中。
- 此示例通过客户端显式配置分发 ECH，不依赖 DNS HTTPS 记录。
- Hysteria2 使用 UDP/QUIC，服务器和中间网络需要放行节点 UDP 端口。
- 使用自签证书时，需要先让客户端信任该证书；不要仅用 `skip-cert-verify: true` 代替正确的证书配置。

可执行 `mihomo -t -f config.yaml` 检查替换好占位值后的完整客户端配置。配置检查通过不代表 ECH 握手或节点连接一定成功。

## 握手失败排查

1. 确认服务端和客户端使用的是同一次生成的配对材料，没有填反或只更新了其中一端。
2. 确认服务端节点启动成功；无效 keyset 会阻止节点启动，可通过 `heki log` 查看原因。
3. 检查节点 UDP 端口、客户端订阅密码、证书域名和证书信任。
4. 确认修改后已重启所属实例或重建容器，并重新加载客户端配置。

XBoard 的完整节点示例见 [XBoard 对接 Hysteria2](hysteria/xboard-hysteria.md)。
