# 获取授权码

## 购买方式

### 方式一：Telegram 机器人（推荐）

**Telegram Bot：** [@Heki_Auth_Bot](https://t.me/Heki_Auth_Bot)

**购买流程：**
1. 打开 Telegram，搜索 `@Heki_Auth_Bot`
2. 点击 `/start` 开始使用
3. 选择套餐类型和人数
4. 使用 USDT (TRC20) 支付
5. 支付完成后自动发放授权码

**优势：**
- ✅ 自动化购买，即买即用
- ✅ 支持 USDT (TRC20) 支付
- ✅ 自动发放授权码
- ✅ 支持查询订单和授权信息
- ✅ 24/7 在线服务

**其他常用操作：**
- 升级套餐：在 Telegram Bot 内自助办理
- 更换域名：在 Telegram Bot 内自助换绑
- 查询授权/订单：在 Telegram Bot 内直接查看

---

## 免费版说明

**不配置 heki_key 即可使用免费版！**

- ✅ 最多支持 88 个有效用户
- ✅ 支持全部 10 种协议
- ✅ 永久免费，无时间限制

详细说明：[免费版文档](heki/free-edition.md)

---

## 付费套餐

支持协议：VMess、Trojan、SS、SSR、VLESS、Hysteria2、TUIC、AnyTLS、Naive、Mieru

- `1-9` 协议：表示从上面协议中任选对应数量
- `10` 协议：表示全协议

| 协议数 | ≤2000 人 | ≤6000 人 | 无限制 |
|--------|----------|----------|--------|
| 1 | 39 USDT | 60 USDT | 90 USDT |
| 2 | 60 USDT | 96 USDT | 153 USDT |
| 3 | 99 USDT | 156 USDT | 243 USDT |
| 4 | 120 USDT | 192 USDT | 306 USDT |
| 5 | 159 USDT | 252 USDT | 396 USDT |
| 6 | 198 USDT | 312 USDT | 486 USDT |
| 7 | 219 USDT | 348 USDT | 549 USDT |
| 8 | 228 USDT | 360 USDT | 569 USDT |
| 9 | 237 USDT | 372 USDT | 589 USDT |
| 10 | 239 USDT | 378 USDT | 599 USDT |

---

# 授权码配置

购买后，在每个 heki 实例的配置中加入以下配置，并重启 heki：

```ini
heki_key=XXXX-XXXX-XXXX-XXXX
```

**配置方法：**

**一键安装版：**
```bash
heki config heki_key=XXXX-XXXX-XXXX-XXXX
heki restart
```

**Docker 版：**
```bash
# 在 docker-compose.yml 中添加
environment:
  heki_key: XXXX-XXXX-XXXX-XXXX

# 重启容器
docker compose restart
```

---

# 授权对接地址

每个授权码绑定一个对接地址（`panel_url`）。

- **首次使用**：自动绑定当前 `panel_url`
- **绑定后**：该授权码只能用于该域名，无法更换
- **更换域名**：可在 Telegram Bot 内自助换绑（收取 5 USDT 手续费）

**示例：**
```
授权码: ABCD-1234-EFGH-5678
绑定域名: panel.example.com

✅ 可以使用: https://panel.example.com
✅ 可以使用: http://panel.example.com:8080
❌ 不能使用: https://other-panel.com
```

---

# 限制人数说明

人数只计算**有效用户**：
- ✅ 有有效套餐
- ✅ 未到期
- ✅ 流量未超出
- ✅ 未被封禁
- ✅ 能正常使用代理

**示例：**

网站总共注册了 1000 名用户：
- 800 名用户已购买套餐且未到期、流量未超
- 100 名用户正在试用（未到期、流量未超）
- 100 名试用已到期或流量已超

**有效人数 = 900 人**

---

# 在线授权特性

1. ✅ **支持升级套餐**：增加人数或协议类型，根据剩余时间补差价
2. ✅ **实时验证**：人数超出会自动限制新用户连接
3. ✅ **域名绑定**：一个授权码绑定一个面板域名
4. ✅ **离线缓存**：网络断开时可使用本地缓存（7 天宽限期）
5. ✅ **多节点支持**：一个授权码可用于多个节点（同一面板）

---

# 常见问题

### Q: 如何查看我的授权信息？

A: 在 Telegram Bot 中发送 `/mykeys` 查看所有授权码和到期时间。

### Q: 授权码可以换绑域名吗？

A: 可以，直接在 Telegram Bot 内自助换绑，收取 5 USDT 手续费。

### Q: 一个授权码可以用于多个节点吗？

A: 可以，只要是同一个面板（同一个 panel_url）。

### Q: 人数超出会怎样？

A: 超出限制后，新用户无法连接，已连接的用户不受影响。建议提前升级。

### Q: 如何升级套餐？

A: 在 Telegram Bot 中选择升级，系统会自动计算补差价。

### Q: 支持退款吗？

A: 授权码一经发放，不支持退款。购买前请确认需求。

### Q: 授权码会过期吗？

A: 会，按购买时长计算。到期前会收到提醒，可续费。

### Q: 免费版可以升级到付费版吗？

A: 可以，购买授权码后在配置文件中添加 `heki_key` 并重启即可。

---

# 售后
如果遇到了 heki 本身的 bug，或授权故障导致的问题，可以及时寻求帮助

如果由于自身的技术原因或疏忽大意导致的`简单问题`，根据`问题描述准确性`给予`口头提示等少量支持`

描述不准确，或无法简单解决的问题，请寻求[付费技术支持](buy/func-custom-and-tec-support.md)
