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

参考: [heki 详细配置项](heki/heki-config.md)

# 第三步，启动 heki

```
heki start
```

若出现启动失败的情况，使用`heki log`查看错误信息
