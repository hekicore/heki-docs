# Xboard 对接 hysteria

# 第一步，在面板添加一个节点

非常简单，教程省略

# 第二步，配置 heki

!> hysteria 必须要配置证书！！！

```ini
type=xboard
server_type=hysteria
panel_url=https://your-xboard.com
panel_key=your-api-key
node_id=1
```

### XBoard 证书与运行时补充

- 面板若下发 `server_name`、`up_mbps`、`down_mbps` 等 Hysteria2 参数，heki 会按面板值接入运行配置
- 面板明确下发 `obfs=none` 时，heki 会关闭 Salamander 混淆，不会继承本地旧的 `hysteria_obfs_type`
- 面板只有在下发 `obfs=salamander` 且同时有 `obfs-password` / `obfs_password` 时，heki 才会启用 Salamander
- 面板若下发 `cert_config`，且本地证书项为空，heki 会自动补全证书模式和证书来源
- 若面板下发的是 `cert_mode=content`，heki 会把 PEM 证书内容安装到本地托管目录，并复用现有 TLS 热加载路径；兼容 `public_key/private_key`、`cert_content/key_content`、`cert/key` 等常见字段别名
- 证书优先级为 `本地手动证书 > 面板下发证书内容 > 自动申请证书`；如果你已经显式填写 `cert_file/key_file` 或 `hysteria_cert_file/key_file`，面板 cert push 不会覆盖它们
- 面板下发包含私钥的 `ech_server_keys` / `ech_key` 时，Hysteria2 会启用 ECH；仅有 `ech_enable` 或客户端 `ech_config` 不足以启用服务端 ECH。也可通过主配置、同名环境变量或节点 `[USER]` 中的 `hysteria_ech_server_keys` 提供 Base64 keyset，本地显式配置优先。无效 keyset 会导致启动失败，修改后需重启所属实例并刷新客户端订阅。

### Hysteria2 ECH 配对配置示例

下面使用支持 `tls ech` 命令的 Xray 生成密钥，并以 Mihomo v1.19.34 作为客户端。Hysteria2 使用 UDP/QUIC，节点端口需要放行 UDP，且客户端必须支持 Hysteria2 ECH。

先在本地生成一对 ECH 材料，`public.example.com` 替换为要放在外层 ClientHello 中的公开名称：

```bash
xray tls ech --serverName public.example.com
```

输出包含两段 Base64：`ECH server keys` 含私钥，只用于 Heki/面板服务端；`ECH config list` 是与它配对的公开配置，用于客户端订阅。不要把两段填反，也不要把服务端私钥发给客户端。此命令生成 ECH 密钥，不会生成节点 TLS 证书。

假设面板中的 Hysteria2 节点 ID 为 `1`、端口为 `443`，证书对应 `node.example.com`，在 `heki.conf` 中配置：

```ini
type=xboard
server_type=hysteria
panel_url=https://your-xboard.com
panel_key=your-api-key
node_id=1
cert_file=/etc/heki/certs/node.example.com.crt
key_file=/etc/heki/certs/node.example.com.key
hysteria_ech_server_keys=BASE64_ECH_SERVER_KEYS
```

把 `BASE64_ECH_SERVER_KEYS` 换成同一次命令输出的完整 `ECH server keys` 单行 Base64，不加引号。证书文件须已存在，且私钥与证书匹配。多节点需要不同 ECH 密钥时，将该键写入对应的 `nodes/node_1.conf` 用户区：

```ini
[USER]
hysteria_ech_server_keys=BASE64_ECH_SERVER_KEYS
```

节点值覆盖主配置；也可以用同名小写环境变量提供主配置默认值。本地显式值优先于面板；若希望完全使用面板下发的 ECH 材料，请移除节点、环境变量和主配置中已有的该键。

客户端把以下节点合并到 Mihomo 配置的 `proxies` 列表，将 `password` 替换为面板订阅的 Hysteria2 密码，将 `BASE64_ECH_CONFIG_LIST` 替换为同一对材料中的 `ECH config list`：

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

`sni` 是加密后的真实节点名称，须匹配节点证书；公开名称已经包含在 ECH config list 中。示例通过客户端显式配置分发 ECH，不依赖 DNS HTTPS 记录。ECH 不代替证书信任；使用自签证书时需要先让客户端信任该证书。

保存后执行 `heki restart`（命名实例执行 `heki instance restart 实例名`），并重新加载客户端配置。Docker 环境变量有变化时需重建容器。用 `mihomo -t -f config.yaml` 检查替换好占位值的完整客户端配置，再通过该节点访问目标；配置检查成功本身不代表连接成功。若握手失败，先核对两段 ECH 材料是否成对、UDP 端口、证书信任及订阅密码。无效服务端 keyset 会阻止该节点启动，可用 `heki log` 查看原因。

参考: [heki 详细配置项](heki/heki-config.md)

# 第三步，启动 heki

```
heki start
```

若出现启动失败的情况，使用`heki log`查看错误信息
