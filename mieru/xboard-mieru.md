# xboard 对接 mieru

## 前提条件

- xboard 面板已部署并正常运行
- 已获取 heki 授权码

## 面板配置

1. 在 xboard 后台添加节点，协议选择 `mieru`
2. 配置节点端口和传输协议参数
3. 保存节点配置

## heki 配置

```
type=xboard
node_id=节点ID
heki_key=你的授权码
panel_url=https://你的面板地址
panel_key=你的通信密钥
```

heki 会自动从面板获取 mieru 协议配置，无需手动指定 `server_type`。

## Mieru 特有配置（可选）

| 参数名 | 默认值 | 说明 |
|-------|--------|------|
| `mieru_transport` | `TCP` | 传输协议，可选: `TCP`、`UDP` |
| `mieru_multiplexing` | `MULTIPLEXING_LOW` | 多路复用级别 |

## 说明

- Mieru 协议自带加密（XChaCha20-Poly1305），不需要额外配置 TLS
- 用户认证使用面板下发的 UUID 作为密码
- 支持 TCP 和 UDP 两种传输模式

## 启动

```bash
heki restart
```

查看日志确认启动成功：

```bash
heki log
```
