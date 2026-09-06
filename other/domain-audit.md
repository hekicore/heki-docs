# 域名访问审计

域名访问审计用于记录认证用户访问指定域名、IP 或测活地址的行为，帮助管理员在节点异常时回查用户范围。功能默认关闭，不改变协议联通性。

## 开启配置

在主配置或对应节点的 `[USER]` 区配置：

```ini
domain_audit_enable=true
domain_audit_domains=api.ip.sb,ipwho.is,198.51.100.8:8899
domain_audit_retention_days=30
```

常用参数：

| 参数 | 默认值 | 说明 |
|---|---:|---|
| `domain_audit_enable` | `false` | 是否开启审计 |
| `domain_audit_domains` | 空 | 逗号分隔的匹配规则；为空时不记录 |
| `domain_audit_log_dir` | `<log_file_dir>/audit` | 审计日志目录；设置为 `false` 可关闭文件输出 |
| `domain_audit_retention_days` | `7` | 保留天数，`0` 表示永久保留 |

当前面板没有审计配置入口，配置只从本地 `heki.conf` 和节点配置读取。

## 支持的规则

```text
api.ip.sb                         # 域名及其子域名
api.ip.sb:443                     # 域名和端口
198.51.100.8                      # IP
198.51.100.8:8899                 # IP 和端口
cidr:198.51.100.0/24              # CIDR 网段
glob:check-*.example.com          # Glob
regexp:^api[0-9]+\.example\.com:443$ # Go RE2 正则
```

像 `198.51.100.8:8899/ip` 这样的测活地址按 `IP:端口` 匹配，路径只作为兼容信息保留，不会被当作真实 HTTP 路径。

## 日志位置与格式

日志按节点和日期保存为 JSONL 文件，例如：

```text
/etc/heki/audit/domain-audit-node-1-2026-08-09.jsonl
```

每行一个 JSON 对象：

```json
{
  "time": "2026-08-09T15:23:01.123Z",
  "node_id": 1,
  "user_id": 9163,
  "protocol": "anytls",
  "network": "tcp",
  "client_ip": "203.0.113.7",
  "target": "api.ip.sb:443",
  "target_host": "api.ip.sb",
  "target_ip": "198.51.100.20",
  "target_port": 443,
  "original_target": "198.51.100.20:443",
  "source": "sniff",
  "status": "connected"
}
```

字段说明：

- `time`：UTC 访问时间
- `node_id` / `user_id`：节点和面板用户 ID
- `protocol` / `network`：协议及 TCP/UDP 类型
- `client_ip`：认证用户的来源 IP
- `target` / `target_host` / `target_ip` / `target_port`：请求目标和实际出站地址
- `original_target`：嗅探或重写前的原始目标
- `source`：记录来源，例如 `sniff`
- `status`：TCP 成功为 `connected`，UDP 首包写出为 `written`

审计记录通过非阻塞队列写入，并按用户、协议、网络和目标进行短时间去重。日志按日期轮转，并由后台任务清理超过保留天数的文件。普通代理无法读取加密 HTTPS 内部路径，因此 `path` 通常为空。

该日志用于辅助排查和缩小可疑账号范围，不应单独作为违规结论依据。
