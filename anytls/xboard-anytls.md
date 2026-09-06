# Xboard 对接 anytls

# 第一步，在面板添加一个节点

非常简单，教程省略。

# 第二步，配置 heki

!> AnyTLS 走 TLS 时需要证书；若 XBoard 下发的是 `tls=2`（Reality），则不需要外部证书。

```ini
type=xboard
server_type=anytls
panel_url=https://your-xboard.com
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

如果 XBoard 下发的是 `tls=2`，heki 会直接按 Reality 启动，不需要本地额外证书。

> 自签证书适用场景：
> - 客户端节点里的 SNI 不是你拥有或可解析的公网域名，常见于运营商对接伪装 SNI
> - 客户端需要开启 `allow_insecure` / “允许不安全”，或手动信任这张自签证书
> - 配置 `cert_mode=self` 后，heki 会自动生成 10 年有效期的 ECDSA 自签证书到 `/etc/heki/certs/self-signed/`，不需要再写 `anytls_cert_file`

当前 heki 运行时已支持 AnyTLS 的 `tcp` / `ws` / `httpupgrade` / `h2` / `grpc` / `xhttp`。
其中 `xhttp` 会在运行时规范化为 `splithttp`，按内置 Xray-core listener 启动，不会静默回退成 `tcp`。

!> XBoard 需要在 AnyTLS 节点配置里返回 `network` / `networkSettings`，heki 才能从面板自动接管 `xhttp` 的 path、host、mode、extra 等字段。
!> 如果你的面板没有返回这些字段，这不是 heki 运行时限制；可以先用本地直配 / Docker 环境写 `anytls_transport=xhttp`，或升级到能完整下发这些字段的面板分支。

### AnyTLS xhttp / splithttp 说明

- 如果你的 XBoard 没有下发 `network/networkSettings`，AnyTLS 会缺少面板侧的 `xhttp` 传输参数；这时请先用 `tcp` / `ws` / `h2` / `grpc`，或改用本地直配 `anytls_transport=xhttp`
- 对于能正确返回字段的面板分支，`network_settings.path` / `network_settings.host` 仍分别对应 heki 的 `anytls_h2_path` / `anytls_h2_host`
- `network_settings.mode` 会映射到运行时 `xhttp_mode`
- `network_settings.extra` 会映射到运行时 `xhttp_extra`
- AnyTLS ECH 在普通 TLS listener 和 `splithttp/xhttp` 的内置 TLS listener 上都会生效；如果面板同时下发了 `ech_server_keys` / `ech_key`，heki 会统一接入
- `splithttp` 不能和 `proxy_protocol`、`mptcp` 同开

### AnyTLS ECH 说明

- 支持面板下发 `ech_server_keys`、`ech_key`，也支持 `tls.ech.key` 这类嵌套字段；`XBoard / XiaoV2Board` 风格的 PEM `ECH KEYS` 内容会自动转成服务端需要的 base64 keyset
- 对 XBoard / XiaoV2Board 的嵌套 `tls.ech.key`，只有 `tls.ech.enabled=true` / `enable=true` 时 heki 才会读取；`enabled=false` 时即使残留 key 字段也不会启用 ECH
- 自签证书也可以和 ECH 一起使用。只要 AnyTLS 走的是 TLS 模式，且最终协商为 TLS 1.3，heki 就可以同时启用 `cert_mode=self` 与 `anytls_ech_server_keys`
- 如果你本地直配，也可以直接写：

```ini
anytls_ech_server_keys=BASE64_ECH_KEYSET
```

- `anytls_ech_server_keys` 只在 TLS 模式下生效；启用后服务端最终必须使用 TLS 1.3
- 如果你显式把 `tls_max_version` 限制在 `1.2`，启动会直接报错，不会静默降级
- 这条规则同样适用于 `xhttp/splithttp`，不是只覆盖 `tcp/ws/h2/grpc`
- 如果你同时用了 `cert_mode=self`，客户端仍需开启 `allow_insecure`，或手动信任这张自签证书；ECH 不会绕过证书校验

例如，自签证书 + ECH 可以直接这样写：

```ini
cert_mode=self
anytls_ech_server_keys=BASE64_ECH_KEYSET
```

### AnyTLS xhttp 本地直配示例

如果你是本地直配或 Docker 调试环境，AnyTLS 走 `xhttp` 时可以直接这样写：

```ini
server_type=anytls
anytls_transport=xhttp
anytls_h2_path=/anytls-xhttp
anytls_h2_host=anytls.example.com
anytls_sni=anytls.example.com
anytls_cert_file=/etc/ssl/private/fullchain.pem
anytls_key_file=/etc/ssl/private/privkey.pem
```

- `xhttp` 继续复用 `anytls_h2_path` / `anytls_h2_host`
- 上面示例是 TLS 版；若走 Reality，则改用通用 `reality_*` 参数或面板下发的 Reality 字段，不需要证书
- 如果面板已经正确返回 `network/networkSettings`，不需要本地额外再写 `anytls_transport`
- `splithttp` 不能和 `proxy_protocol`、`mptcp` 同开

### Docker + Cloudflare DNS 自动证书示例

如果你是 Docker 部署，并且希望 heki 自己为 AnyTLS 自动申请证书，可以直接用下面这份：

```bash
docker run --restart=on-failure --name heki -d \
  -v /etc/heki/:/etc/heki/ --network host \
  -e type=xboard \
  -e server_type=anytls \
  -e panel_url=https://your-xboard.com \
  -e panel_key=your-server-token \
  -e node_id=1 \
  -e cert_domain=node1.example.com \
  -e cert_mode=dns \
  -e dns_provider=dns_cf \
  -e cert_key_length=ec-256 \
  -e DNS_CF_Email=your@email.com \
  -e DNS_CF_Key=your-cloudflare-api-key \
  hekicore/heki:latest
```

- AnyTLS 走 TLS 时必须配置证书；若面板下发 `tls=2` Reality，则不需要额外证书
- `cert_mode=dns` 不占用 80 端口
- Docker / `heki.conf` / `node_x.conf` 里都推荐统一写 `DNS_CF_Email`、`DNS_CF_Key`
- 如果要让 heki 自己处理 TLS，不要设置 `force_close_ssl=true`
- 只有在前面另挂 nginx / caddy 做 TLS 卸载时，才需要 `force_close_ssl=true`

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

- XBoard 若下发 `padding_scheme`，且本地未显式填写 `anytls_padding_scheme`，heki 会自动接管
- XBoard 若下发启用状态的 `tls.ech.key`、`ech_key` 或 `ech_server_keys`，且本地未显式填写 `anytls_ech_server_keys`，heki 会自动接管
- 若你已经在本地显式写了 `anytls_padding_scheme`，则以本地为准
- 面板若下发 `cert_config`，且本地证书项为空，heki 会在启动时自动补全证书模式和证书来源
- 若面板下发的是 `cert_mode=content`，heki 会把 PEM 证书内容安装到本地托管目录，并复用现有 TLS 热加载路径；兼容 `public_key/private_key`、`cert_content/key_content`、`cert/key` 等常见字段别名
- 证书优先级为 `本地手动证书 > 面板下发证书内容 > 自动申请证书`；如果你已经显式填写 `cert_file/key_file` 或 `anytls_cert_file/key_file`，面板 cert push 不会覆盖它们

参考: [heki 详细配置项](heki/heki-config.md)

# 第三步，启动 heki

```
heki start
```

若出现启动失败的情况，使用 `heki log` 查看错误信息。
