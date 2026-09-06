# ClickHouse 访问日志

ClickHouse 访问日志用于集中保存全部已认证、成功建立的用户访问事件。它与域名访问审计相互独立：域名审计只记录命中 `domain_audit_domains` 的目标并写入本地 JSONL；ClickHouse 访问日志不做目标过滤，记录所有协议产生的成功访问事件。

功能默认关闭。写入使用有界内存队列和 `JSONEachRow` 批次，ClickHouse 故障或变慢不会阻塞代理数据面。

## 最小配置

```ini
access_log_enable=true
access_log_clickhouse_url=http://127.0.0.1:8123
access_log_clickhouse_database=default
access_log_clickhouse_table=heki_access_logs
access_log_clickhouse_username=default
access_log_clickhouse_password=
```

`access_log_clickhouse_url` 必须是 ClickHouse HTTP(S) 接口，默认端口为 `8123`；native 协议的 `9000` 端口不能用于该配置。URL 中不要放账号密码，应使用独立的 username/password 参数。

完整参数：

| 参数 | 默认值 | 说明 |
|---|---:|---|
| `access_log_enable` | `false` | 总开关，也可在节点 `[USER]` 区单独覆盖 |
| `access_log_clickhouse_url` | `http://127.0.0.1:8123` | ClickHouse HTTP(S) 地址 |
| `access_log_clickhouse_database` | `default` | 数据库名；必须提前存在 |
| `access_log_clickhouse_table` | `heki_access_logs` | 表名 |
| `access_log_clickhouse_username` | `default` | 写入用户 |
| `access_log_clickhouse_password` | 空 | 写入密码，不会输出到日志 |
| `access_log_clickhouse_batch_size` | `500` | 单批事件数，范围 `1-10000` |
| `access_log_clickhouse_flush_interval` | `5` | 未满批次时的刷新间隔，秒 |
| `access_log_clickhouse_request_timeout` | `5` | 单次 HTTP 请求超时，秒 |
| `access_log_clickhouse_auto_create` | `true` | 是否自动创建表 |

## 表结构

默认开启自动建表，启动后的第一批数据写入前会执行：

```sql
CREATE TABLE IF NOT EXISTS `default`.`heki_access_logs` (
    event_time DateTime64(3, 'UTC'),
    node_id UInt32,
    user_id UInt64,
    protocol LowCardinality(String),
    network LowCardinality(String),
    client_ip String,
    target String,
    target_host String,
    target_ip String,
    target_port UInt16,
    original_target String,
    source LowCardinality(String),
    path String,
    status LowCardinality(String)
) ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (node_id, user_id, event_time, target_host);
```

数据库不会自动创建。启用自动建表时，ClickHouse 用户需要目标数据库的 `CREATE TABLE` 和 `INSERT` 权限；若由管理员预先建表，可设置 `access_log_clickhouse_auto_create=false`，运行账号只保留 `INSERT` 权限。

当前自动表结构不设置 TTL，避免节点启动时修改已有表的保留策略。可由 ClickHouse 管理员按合规要求配置 TTL，例如保留 90 天：

```sql
ALTER TABLE default.heki_access_logs
MODIFY TTL event_time + INTERVAL 90 DAY DELETE;
```

## 记录语义

- TCP 在目标连接成功后记录，`status=connected`。
- UDP 在首包成功写出后记录，`status=written`。
- 覆盖 VMess、VLESS、Trojan、SS/SS2022、SSR TCP、AnyTLS、Hysteria2、TUIC、Naive 和 Mieru 的现有统一访问事件链路。
- `ss_obfs_udp` 使用节点主密码，协议本身无法识别真实用户，因此不写入需要准确 `user_id` 的访问日志；不会用任意用户 ID 代替。
- `client_ip` 是认证客户端来源 IP；`target_host`/`target_port` 是逻辑目标；`target_ip` 是实际成功出站地址。
- `path` 仅在协议链路能够明确获得时填写。普通 HTTPS 代理看不到加密 HTTP 路径，因此通常为空。
- 不记录认证失败和未成功建立/写出的访问。

## 查询示例

查看某个用户最近的访问：

```sql
SELECT event_time, node_id, protocol, network, client_ip,
       target_host, target_ip, target_port, status
FROM default.heki_access_logs
WHERE user_id = 9163
ORDER BY event_time DESC
LIMIT 100;
```

按目标域名聚合：

```sql
SELECT target_host, count() AS visits, uniqExact(user_id) AS users
FROM default.heki_access_logs
WHERE event_time >= now() - INTERVAL 1 DAY
GROUP BY target_host
ORDER BY visits DESC
LIMIT 100;
```

## 故障行为

写入线程不会运行在协议数据面。失败的当前批次会保留并按刷新间隔重试；保留批次期间队列仍有固定上限，队列满后新事件会被丢弃并输出累计 dropped 告警。服务停止时会在同一个请求超时期限内按配置批次刷新剩余事件，超时后尚未写出的事件计入 dropped。ClickHouse 恢复后会输出 writer recovered 日志。

访问日志包含用户网络行为和来源 IP，应限制 ClickHouse 账号权限、使用 TLS 或可信内网，并设置符合业务要求的 TTL 和访问控制。
