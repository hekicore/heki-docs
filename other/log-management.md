# 日志文件管理

## 功能说明

heki 支持将日志按天保存到文件，并自动清理过期日志。日志文件以 `YYYY-MM-DD.log` 格式命名。

## 关注域名审计

域名审计默认关闭。需要先在主配置或对应节点的 `[USER]` 区配置 `domain_audit_enable=true`，再填写 `domain_audit_domains`；节点只对命中的目标记录访问线索，按用户、协议、网络和目标在 60 秒内去重。普通规则支持域名/子域名、`域名:端口`、IP 和 IP+端口，也支持 `cidr:198.51.100.0/24`、`glob:check-*.example.com`、`regexp:^api[0-9]+\\.example\\.com:443$`。`198.51.100.8:8899/ip` 这类测活地址按其 `IP:端口` 匹配，路径只作为配置兼容信息保留。正则使用 Go RE2，配置加载时校验并预编译；非法本地配置会阻止启动。当前面板没有审计配置入口，审计设置不会从面板动态更新。

审计文件单独保存在 `<log_file_dir>/audit/`，按节点和日期命名，例如：

```
/etc/heki/audit/domain-audit-node-1-2026-03-12.jsonl
```

每行是一个 JSON 对象，核心字段包括：

```json
{"time":"2026-03-12T08:00:00.123Z","node_id":1,"user_id":9163,"protocol":"anytls","network":"tcp","client_ip":"203.0.113.7","target_host":"api.ip.sb","target_ip":"198.51.100.20","target_port":443,"target":"api.ip.sb:443","original_target":"198.51.100.20:443","path":"","status":"connected","source":"sniff"}
```

`client_ip` 是认证用户的来源地址，`target_host`/`target_port` 是用户请求的目标，`target_ip` 是成功出站连接实际使用的地址；TCP 成功状态为 `connected`，UDP 首包成功写出状态为 `written`。普通代理协议无法看到加密 HTTP 内部路径，因此 `path` 通常为空，不会把配置规则中的 `/ip` 误当作真实请求路径。该日志用于排查访问关系，不应单独作为“内鬼”认定依据。设置 `domain_audit_enable=false`、`domain_audit_log_dir=false` 或不配置关注域名即可关闭输出。

日志轮转与过期清理由后台定时任务执行，默认每小时检查一次；跨天后会在下一次检查时自动切换到新文件，并清理超过保留天数的旧日志。

## ClickHouse 全量访问日志

需要跨节点集中查询全部成功访问时，可单独启用 `access_log_enable=true`。该功能不受 `domain_audit_enable` 和 `domain_audit_domains` 影响，通过有界队列批量写入 ClickHouse，数据库不可用时不会阻塞代理连接。配置、表结构、权限和查询示例见 [ClickHouse 访问日志](other/access-log-clickhouse.md)。

## 配置参数

| 参数名                       | 默认值          | 说明                                                              |
|---------------------------|--------------|-------------------------------------------------------------------|
| `log_level`               | `info`       | 日志等级，可选：`debug`、`info`、`warn`、`error`                           |
| `log_file_dir`            | `/etc/heki/` | 日志保存目录。设置为空或 `false` 则不保存日志到文件，只输出到控制台                        |
| `log_file_retention_days` | `7`          | 日志保存天数，超过天数的日志文件将自动删除。设置为 `0` 表示永久保存                          |

上表中的 `/etc/heki/` 是默认实例路径。命名实例没有设置其他 `log_file_dir` 时，会自动使用自己的配置目录，例如实例 `hk-a` 使用 `/etc/heki/hk-a/`。

## 配置示例

### 默认配置

日志保存到 `/etc/heki/`，保留 7 天：
```
log_file_dir=/etc/heki/
log_file_retention_days=7
```

### 自定义日志目录

```
log_file_dir=/var/log/heki/
log_file_retention_days=30
```

### 只输出到控制台（不保存文件）

```
log_file_dir=false
```

### 开启 debug 日志

排查问题时可临时开启 debug 级别：
```
log_level=debug
```

## 日志文件格式

日志文件按天命名：
```
/etc/heki/2026-03-12.log
/etc/heki/2026-03-11.log
/etc/heki/2026-03-10.log
...
```

超过 `log_file_retention_days` 天数的日志文件会在后台定时检查时自动删除。

## 额外建议

- `systemd` 部署除了 heki 自己的文件日志，还要关注 `journalctl` 占用；建议在宿主机为 `journald` 配置 `SystemMaxUse`
- `OpenRC` 默认 stdout/stderr 会写到 `/var/log/heki/heki.log` 和 `/var/log/heki/heki.err`，如果长期运行，建议额外配合 `logrotate`

## 查看日志的方式

### 方式一：heki 命令（推荐）

```bash
# 默认实例
heki log

# 命名实例，例如 hk-a
heki instance log hk-a
```

命令会先显示最近 100 行，然后持续跟踪新日志，按 `Ctrl+C` 退出查看。多节点时支持按节点 ID 过滤日志。

### 方式二：systemd journal

```bash
# 默认实例
journalctl -u heki -f --no-pager -n 100

# 命名实例，例如 hk-a
journalctl -u 'heki@hk-a.service' -f --no-pager -n 100

# 命名实例最近 30 分钟的历史日志
journalctl -u 'heki@hk-a.service' --since '30 min ago' --no-pager
```

### 方式三：直接查看日志文件

```bash
# 默认实例
cat /etc/heki/2026-03-12.log
tail -f /etc/heki/2026-03-12.log

# 命名实例，例如 hk-a
tail -f /etc/heki/hk-a/2026-03-12.log
```

命名实例没有显式设置 `log_file_dir` 时，文件日志默认跟随实例配置目录。更完整的实例状态、日志筛选和端口排查命令见：[多节点 & 多实例部署](other/heki-multi-instance.md)。
