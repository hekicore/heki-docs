# V2board / xiaov2board 对接 anytls

!> 原版 V2Board 的实际兼容性取决于面板分支返回的 API 字段。若你的面板未返回 anytls 所需字段，建议优先使用 XBoard / PPanel。
!> 已适配的 `xiaov2board` `v2node` 分支可下发 `listen_ip`、`padding_scheme`、`base_config` 等字段。

# 第一步，在面板添加一个节点

非常简单，教程省略。

# 第二步，配置 heki

!> AnyTLS 默认/常见仍是 TLS，TLS 模式需要证书；若面板分支返回完整 Reality 字段，heki 也支持 Reality，此时不需要外部证书。

```ini
# xiaov2board 用这个
type=xiaov2board

# 原版 V2Board 改成 type=v2board
server_type=anytls
panel_url=https://your-v2board.com
panel_key=your-key
node_id=1

# TLS 模式下的证书配置（三选一）
# 方式一：自动申请（推荐，要求 cert_domain 是你自己拥有的真实域名）
cert_domain=your-domain.com
cert_mode=http
# cert_mode=dns 不占用 80 端口，需要额外配置 dns_provider 及对应 DNS_xxx 凭据

# 方式二：手动指定证书
# anytls_cert_file=/path/to/fullchain.pem
# anytls_key_file=/path/to/private.key

# 方式三：自签证书（客户端需开启 allow_insecure / "允许不安全"）
# 适用于面板下发的 SNI 是伪装域名（例如 xxx.ceair.com 这种不是你自己拥有的域名），
# 此时无法通过 HTTP-01 / DNS-01 校验，只能用自签
# cert_mode=self
```

如果面板分支下发的是 Reality，则不需要再写证书项；原版 V2Board 是否会返回完整 Reality 字段取决于具体分支。

> 自签证书适用场景：
> - 客户端节点里的 SNI 不是你拥有或可解析的公网域名，常见于运营商对接伪装 SNI
> - 客户端需要开启 `allow_insecure` / “允许不安全”，或手动信任这张自签证书
> - 配置 `cert_mode=self` 后，heki 会自动生成 10 年有效期的 ECDSA 自签证书到 `/etc/heki/certs/self-signed/`，不需要再写 `anytls_cert_file`

当前 heki 已确认支持 `tcp` / `ws` / `httpupgrade` / `h2` / `grpc` / `xhttp`。
对 `xiaov2board` `v2node` 下发的 `xhttp`，heki 会在运行时规范化为 `splithttp`，不会静默退回 `tcp`。

### AnyTLS ECH 说明

- `xiaov2board` / 新分支常见的 `ech_key`、`ech_server_keys`、`tls.ech.key`，heki 都会尝试接入
- 如果面板给的是 PEM 包裹的 `ECH KEYS`，heki 会自动规范化成服务端运行时使用的 base64 keyset
- 自签证书也可以和 ECH 一起使用。只要 AnyTLS 走的是 TLS 模式，且最终协商为 TLS 1.3，heki 就可以同时启用 `cert_mode=self` 与 `anytls_ech_server_keys`
- 本地直配时也可以直接写：

```ini
anytls_ech_server_keys=BASE64_ECH_KEYSET
```

- `anytls_ech_server_keys` 只在 TLS 模式下生效；启用后要求 TLS 1.3
- 这条限制同样覆盖 `xhttp/splithttp` 的内置 TLS listener，不是只覆盖普通 `tcp/ws/h2/grpc`
- 如果你显式把 `tls_max_version` 限制在 `1.2`，启动会直接报错，不会静默降级
- 如果你同时用了 `cert_mode=self`，客户端仍需开启 `allow_insecure`，或手动信任这张自签证书；ECH 不会绕过证书校验

例如，自签证书 + ECH 可以直接这样写：

```ini
cert_mode=self
anytls_ech_server_keys=BASE64_ECH_KEYSET
```

### 可选：回落防探测

> ⚠️ 此功能**需要你自己在本机另外部署一个 HTTP 服务**（如 nginx / caddy），heki **不会自动装**。如果 fallback 地址没人监听，认证失败的连接会直接 `Connection refused`，伪装效果等同于不配。

配置回落后，认证失败的连接会被 heki 透明转发到本地 HTTP 服务，使节点从外部看起来像一个普通网站，抵御主动探测：

```ini
anytls_fallback_addr=127.0.0.1
anytls_fallback_port=8080
```

**最小 nginx 安装示例**（Debian / Ubuntu）：

```bash
apt update && apt install -y nginx
# 把默认站点改为只监听 127.0.0.1:8080
sed -i 's|listen 80 default_server;|listen 127.0.0.1:8080 default_server;|' /etc/nginx/sites-available/default
sed -i 's|listen \[::\]:80 default_server;|# listen [::]:80 default_server;|' /etc/nginx/sites-available/default
systemctl restart nginx
# 验证：应该看到 nginx 默认欢迎页
curl -I http://127.0.0.1:8080
```

**推荐：反代一个真实公开网站**（伪装效果更好），编辑 `/etc/nginx/sites-available/default`：

```nginx
server {
    listen 127.0.0.1:8080 default_server;
    location / {
        proxy_pass https://www.bing.com;
        proxy_ssl_server_name on;
        proxy_set_header Host www.bing.com;
    }
}
```

> 💡 不需要这个功能就**直接不写** `anytls_fallback_addr`，heki 默认行为是直接关闭认证失败的连接，个人 / 小范围部署这样就够用。

### 可选：防暴力破解

自动封禁短时间内多次认证失败的 IP：

```ini
anytls_invalid_access_enable=true
```

### 可选：自定义 padding scheme

```ini
# base64 编码；留空使用默认值
# anytls_padding_scheme=BASE64_ENCODED_PADDING_SCHEME
```

- `xiaov2board` 若下发 `padding_scheme`，且本地未显式填写 `anytls_padding_scheme`，heki 会自动接管
- `xiaov2board` 显式下发的具体 `listen_ip` 会作为节点监听地址输入；若返回 `0.0.0.0 / ::` 这类通配地址，heki 会视为默认值而忽略
- `base_config` 会自动接入同步/上报阈值参数
- `ech_key / ech_server_keys` 若由面板下发，且本地未显式填写 `anytls_ech_server_keys`，heki 会自动接管

参考: [heki 详细配置项](heki/heki-config.md)

# 第三步，启动 heki

```
heki start
```

若出现启动失败的情况，使用 `heki log` 查看错误信息。
