# ppanel 对接 hysteria

## 第一步，在面板添加一个节点

在 ppanel 后台添加 Hysteria2 节点，配置端口、SNI、带宽限制等参数。

可选配置项：
- `obfs_password`：混淆密码（启用后使用 salamander 混淆）
- `hop_ports`：客户端字段，heki 服务端不使用
- `hop_interval`：客户端字段，heki 服务端不使用
- `up_mbps` / `down_mbps`：带宽限制

混淆兼容说明：

- ppanel 明确下发 `obfs=salamander` 且同时有 `obfs_password` 时，heki 会启用 Hysteria2 Salamander。
- ppanel 明确下发 `obfs=none` 时，heki 会关闭混淆，不会继承本地旧的 `hysteria_obfs_type`。
- 兼容旧 ppanel 字段：如果面板没有 `obfs` 字段但下发了 `obfs_password`，heki 仍会按旧语义启用 `salamander`。

> Hysteria2 基于 QUIC/UDP 协议，中转服务器需要支持 UDP 转发

## 第二步，配置 heki

!> hysteria 必须要配置证书！！！

```ini
type=ppanel
server_type=hysteria
panel_url=https://your-ppanel.com
panel_key=your-secret-key
node_id=1

# 证书配置（三选一）
# 方式一：自动申请（推荐，heki 会自动从面板获取域名申请证书）
cert_domain=your-domain.com
cert_mode=http

# 方式二：手动指定证书
# hysteria_cert_file=/path/to/fullchain.pem
# hysteria_key_file=/path/to/private.key

# 方式三：自签证书（客户端需开启 allow_insecure）
# cert_mode=self
```

参考: [heki 详细配置项](heki/heki-config.md)

## 第三步，启动 heki

```bash
heki start
```

若出现启动失败的情况，使用 `heki log` 查看错误信息
