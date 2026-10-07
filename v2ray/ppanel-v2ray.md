# ppanel 对接 v2ray / VMess

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

在 ppanel 后台添加 VMess 节点，配置端口、传输层、TLS 等参数。

当前 heki 已确认兼容 ppanel 下发的 `tcp` / `ws` / `httpupgrade` / `h2` / `grpc` / `xhttp` / `splithttp`。
无论 ppanel 写 `xhttp` 还是 `splithttp`，heki 都会在运行时统一按 `splithttp` 启动，不会静默退回 `tcp`。

## 第二步，配置 heki

```ini
type=ppanel
server_type=v2ray
panel_url=https://your-ppanel.com
panel_key=your-secret-key
node_id=1
```

!> 若启用 tls 则必须要配置证书！！！

参考: [heki 详细配置项](heki/heki-config.md)

## 第三步，启动 heki

```bash
heki start
```

若出现启动失败的情况，使用 `heki log` 查看错误信息。
