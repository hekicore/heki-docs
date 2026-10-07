# Xboard 对接 v2ray / VMess

> 使用 VMessAEAD 必看: [VMessAEAD 优化](other/vmess-aead.md)

## 同步时间（重要）

> VMess 节点需要进行时间同步，时间若与客户端相差太大则无法连接

CentOS 7

```bash
yum install -y ntp
systemctl enable ntpd
ntpdate -q 0.rhel.pool.ntp.org
systemctl restart ntpd
```

Debian 9 / Ubuntu 16

```bash
apt-get install -y ntp
systemctl enable ntp
systemctl restart ntp
```

## 第一步，在面板添加一个节点

非常简单，教程省略。

当前 heki 已确认支持 XBoard 下发的 `tcp` / `ws` / `httpupgrade` / `h2` / `grpc` / `xhttp`。
面板下发的 `xhttp` 会在运行时规范化为 `splithttp`，按内置 Xray-core listener 启动，不会静默退回 `tcp`。

## 第二步，配置 heki

```ini
type=xboard
server_type=v2ray
panel_url=https://your-xboard.com
panel_key=your-api-key
node_id=1

# 如果你的 XBoard 仍是旧 UniProxy 接口，可手动切回 V1
# xboard_api_version=1
```

### XHTTP / SplitHTTP 配置说明

- XBoard 面板里写 `network=xhttp` 即可，heki 运行时会统一按 `splithttp` listener 启动
- `network_settings.path` / `network_settings.host` 仍分别对应 heki 的 `vmess_h2_path` / `vmess_h2_host`
- `network_settings.mode` 会映射到运行时 `xhttp_mode`
- `network_settings.extra` 会映射到运行时 `xhttp_extra`
- XBoard 常见模版里，`xhttp_extra` 支持 `"16-32"`、`"8"`、`"true"` 这类字符串写法，heki 会自动归一化
- 如果默认模版里带了不完整的 `downloadSettings` 占位对象，例如只有 `path` / `mode`，heki 会自动忽略，不会因此导致节点启动失败
- 如果你显式写了完整 `downloadSettings`，但值本身非法，heki 仍会直接报错，避免把真实配置错误静默吞掉
- `splithttp` 当前不能与 `proxy_protocol` 或 `mptcp` 同开

一个常见的 XBoard `protocol_settings` 示例可以写成这样：

```json
{
  "network": "xhttp",
  "tls": 0,
  "network_settings": {
    "path": "/xhttp",
    "host": "www.bing.com",
    "mode": "auto",
    "extra": {
      "xmux": {
        "max_concurrency": "8"
      }
    }
  }
}
```

### TLS / 证书补全

- 面板若下发 `cert_config`，heki 会在本地证书项为空时自动补全 `cert_mode`、`cert_domain`、`cert_file`、`key_file`、`dns_provider`
- 若面板下发的是 `cert_mode=content`，heki 会把 PEM 证书内容安装到本地托管目录，并复用现有 TLS 热加载路径；兼容 `public_key/private_key`、`cert_content/key_content`、`cert/key` 等常见字段别名
- 证书优先级为 `本地手动证书 > 面板下发证书内容 > 自动申请证书`；如果你已经显式填写 `cert_file/key_file` 或 `vmess_cert_file/key_file`，面板 cert push 不会覆盖它们
- 面板若下发 `tls_settings.reject_unknown_sni=1`，heki 会在 TLS 握手阶段校验客户端 SNI；优先使用 `server_name`，若未显式给出则会尝试从当前协议的有效 host/SNI 推导

### 运行时补充

- 面板显式下发的具体 `listen_ip` 会作为节点监听地址输入；若返回 `0.0.0.0 / ::` 这类通配地址，heki 会视为默认值而忽略
- `base_config.push_interval` / `pull_interval` / `node_report_min_traffic` / `device_online_min_traffic` 会自动接入运行参数
- 面板 `routes` / `custom_outbounds` / `custom_routes` JSON 现在会自动转换为 heki 本地路由模型；匹配时优先按面板路由执行，未命中再继续匹配本地 `routes_file` / `routes_url`（未显式配置 `routes_file` 时默认回退到同目录 `routes.toml`）
- 若面板路由里使用了 heki 当前无法承载的字段或出站类型，启动时会明确报出具体规则位置和不支持字段
- 对 XBoard V2，如果 `config` 响应缺少 `protocol`，heki 会先按 payload 特征推断；无法安全判断时直接报错，避免误判协议

!> 若启用 tls 则必须要配置证书！！！

参考: [heki 详细配置项](heki/heki-config.md)

## 第三步，启动 heki

```bash
heki start
```

若出现启动失败的情况，使用 `heki log` 查看错误信息。
