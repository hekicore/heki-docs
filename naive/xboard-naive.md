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
server_type=naive
node_id=节点ID
heki_key=你的授权码
panel_url=https://你的面板地址
panel_key=你的通信密钥
```

heki 需要手动指定 `server_type` 来配置协议类型，端口、TLS 等参数会自动从面板获取。Naive 在 heki 内置实现中走 `HTTP/2 CONNECT over TLS`，请保持面板 TLS 开启。

## Naive 特有配置（可选）

| 参数名 | 默认值 | 说明 |
|-------|--------|------|
| `naive_enable_tls` | `true` | 是否启用 TLS；Naive 当前可用路径需要保持开启 |
| `naive_cert_file` | 无 | TLS 证书文件路径 |
| `naive_key_file` | 无 | TLS 密钥文件路径 |
| `naive_server_name` | 无 | TLS SNI 域名 |

## 证书配置

Naive 协议需要 TLS，heki 会自动从面板获取域名并申请证书。若 XBoard 分支下发 `tls=0`，heki 会解析到该字段，但当前内置 Naive 处理器不会提供完整的明文 HTTP/2 CONNECT 服务，实际使用请把面板 TLS 打开。也可以手动配置：

```
naive_cert_file=/path/to/cert.pem
naive_key_file=/path/to/key.pem
```

或使用自动申请：

```
cert_domain=your-domain.com
cert_mode=http
```

### XBoard 证书补充

- 面板若下发 `cert_config`，且本地证书项为空，heki 会自动补全证书模式和证书来源
- 若面板下发的是 `cert_mode=content`，heki 会把 PEM 证书内容安装到本地托管目录，并复用现有 TLS 热加载路径；兼容 `public_key/private_key`、`cert_content/key_content`、`cert/key` 等常见字段别名
- 证书优先级为 `本地手动证书 > 面板下发证书内容 > 自动申请证书`；如果你已经显式填写 `cert_file/key_file` 或 `naive_cert_file/key_file`，面板 cert push 不会覆盖它们

## 启动

```bash
heki restart
```

查看日志确认启动成功：

```bash
heki log
```
