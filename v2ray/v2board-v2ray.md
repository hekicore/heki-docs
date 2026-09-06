# V2board / xiaov2board 对接 v2ray / VMess

> 使用 VMessAEAD 必看: [VMessAEAD 优化](other/vmess-aead.md)

!> 原版 V2Board 的实际兼容性取决于面板分支返回的 API 字段。若你的面板未返回 VMess 所需字段，建议优先使用 XBoard / PPanel。
!> 已适配的 `xiaov2board` `v2node` 分支可下发 `listen_ip`、`base_config` 等字段；VMess 传输层 heki 当前接受 `tcp` / `ws` / `httpupgrade` / `h2` / `grpc` / `xhttp`。

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

当前 heki 已确认支持 `tcp` / `ws` / `httpupgrade` / `h2` / `grpc` / `xhttp`。
对 `xiaov2board` `v2node` 下发的 `xhttp`，heki 会在运行时规范化为 `splithttp`，不会静默退回 `tcp`。

## 第二步，配置 heki

```ini
# xiaov2board 用这个
type=xiaov2board

# 原版 V2Board 改成 type=v2board
server_type=v2ray
panel_url=https://your-panel.com
panel_key=your-api-key
node_id=1

# 旧版 xiaov2board 若 V2 config 不可用，可强制走 V1
# xboard_api_version=1
```

### 面板字段补充

- `xiaov2board` 显式下发的具体 `listen_ip` 会作为节点监听地址输入；若返回 `0.0.0.0 / ::` 这类通配地址，heki 会视为默认值而忽略
- `base_config.push_interval` / `pull_interval` / `node_report_min_traffic` / `device_online_min_traffic` 会自动接入运行参数
- 面板 `routes` / `custom_outbounds` / `custom_routes` JSON 现在会自动转换为 heki 本地路由模型；匹配时优先按面板路由执行，未命中再继续匹配本地 `routes_file` / `routes_url`（未显式配置 `routes_file` 时默认回退到同目录 `routes.toml`）
- 若面板路由里使用了 heki 当前无法承载的字段或出站类型，启动时会明确报出具体规则位置和不支持字段

!> 若启用 tls 则必须要配置证书！！！

参考: [heki 详细配置项](heki/heki-config.md)

## 第三步，启动 heki

```bash
heki start
```

若出现启动失败的情况，使用 `heki log` 查看错误信息。
