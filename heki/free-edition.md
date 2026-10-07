# 免费版说明

不配置 `heki_key` 即可使用免费版，无需注册、无需授权码。

- 最多支持 88 个有效用户
- 支持全部 10 种协议，功能与付费版完全一致
- 永久免费，无时间限制，无需联网验证

---

## 如何使用

在配置文件中不填写 `heki_key` 即可：

```ini
type=xboard
server_type=v2ray
panel_url=https://your-panel.com
panel_key=your-api-key
node_id=1

# 不填写 heki_key 即为免费版
```

Docker 部署同理，不设置 `heki_key` 环境变量即可。

---

## 用户数限制

免费版限制 88 个有效用户。有效用户指：有有效套餐、未到期、流量未超出、未被封禁的用户。

超过 88 人时：
- 按用户 ID 排序，前 88 个用户正常使用
- 第 89 个及以后的用户无法连接
- 已连接的用户不受影响
- 日志会显示警告：

```
[WARN] [Node 1] User count (120) exceeds license limit (88), only first 88 users will be active
```

> 限制的是有效用户总数，不是在线用户数。100 个有效用户即使只有 50 个在线，也会触发限制。

---

## 升级到付费版

购买授权码后，在配置文件中添加 `heki_key` 并重启即可，无需重新安装：

```ini
heki_key=XXXX-XXXX-XXXX-XXXX
```

```bash
heki restart
```

购买方式：[@Heki_Auth_Bot](https://t.me/Heki_Auth_Bot) | [查看套餐](buy/get-license-code.md)
