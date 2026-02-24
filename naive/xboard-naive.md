# xboard 对接 naive

## 前提条件

- xboard 面板已部署并正常运行
- 已获取 heki 授权码

## 面板配置

1. 在 xboard 后台添加节点，协议选择 `naive`
2. 配置节点端口和 TLS 相关参数
3. 保存节点配置

## heki 配置

```
type=xboard
node_id=节点ID
heki_key=你的授权码
panel_url=https://你的面板地址
panel_key=你的通信密钥
```

heki 会自动从面板获取 naive 协议配置，无需手动指定 `server_type`。

## Naive 特有配置（可选）

| 参数名 | 默认值 | 说明 |
|-------|--------|------|
| `naive_enable_tls` | `true` | 是否启用 TLS |
| `naive_cert_file` | 无 | TLS 证书文件路径 |
| `naive_key_file` | 无 | TLS 密钥文件路径 |
| `naive_server_name` | 无 | TLS SNI 域名 |

## 证书配置

Naive 协议默认需要 TLS，heki 会自动检测面板下发的域名并申请证书。也可以手动配置：

```
naive_cert_file=/path/to/cert.pem
naive_key_file=/path/to/key.pem
```

或使用自动申请：

```
cert_domain=your-domain.com
cert_mode=http
```

## 启动

```bash
heki restart
```

查看日志确认启动成功：

```bash
heki log
```
