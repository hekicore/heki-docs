# heki-v1 WebAPI

`heki-v1` 是 heki 对外公开的、版本化的控制面 WebAPI。

它不要求第三方面板去复刻 XBoard / SSPanel / PPanel 的历史字段，而是提供一套稳定、清晰、适合长期维护的公共接口。只要你的后端按本文档实现接口，`type=heki-v1` 的 heki 节点就可以直接接入。

> 文档入口： [WebAPI 文档](heki-v1-webapi.md) | [参考后端](heki-v1-example-server.md) | <a href="panel/heki-v1.openapi.yaml" target="_blank" rel="noopener">OpenAPI 规范</a>

## 文档定位

- <a href="panel/heki-v1.openapi.yaml" target="_blank" rel="noopener">heki-v1.openapi.yaml</a>：规范源文件，适合代码生成、接口校验、CI 审查
- 本文档：阅读版文档，强调接入方式、约束、边界和示例
- `examples/heki-v1-server`：最小可运行参考后端，适合联调和回归

## 1. 概览

### 1.1 协议目标

- 固定版本路径：`/api/v1/...`
- 使用标准 HTTP 语义处理鉴权、缓存、状态码和错误体
- 只暴露 heki 运行时真正消费的字段，不复刻历史面板的全部私有结构
- 后续新增能力只通过新增可选字段扩展，避免破坏性重命名

### 1.2 协议边界

`heki-v1` 只定义 **控制面后端 -> heki 节点** 之间的公共接口。

它适合这些场景：

- 你要自己实现控制面后端，直接给 heki 下发节点和用户数据
- 现成面板的原生 API 不支持 heki 已支持的能力
- 你希望用一套稳定、可审计、可版本化的公开协议替代历史私有字段

它不负责这些内容：

- 终端用户订阅格式
- 面板前台展示
- 客户端模板导出
- Xiao / XBoard 现有订阅模板的自动兼容

如果你还希望用户在前台看到这些节点，或客户端下载到对应插件参数，仍需要在你自己的前台 / 订阅导出层单独实现。

## 2. 快速接入

heki 侧配置示例：

```ini
type=heki-v1
server_type=vless
node_id=1
panel_url=https://api.example.com/heki
panel_key=your-api-key
```

说明：

- `panel_url` 是 API 基础地址，heki 会自动拼接 `/api/v1/nodes/{node_id}` 等路径
- `panel_key` 通过 `Authorization: Bearer <panel_key>` 发送
- `server_type` 仍建议填写一个默认提示值，但最终以 API 返回的 `protocol` 为准

## 3. 通用约定

### 3.1 Base URL

基础地址来自 `panel_url`。

如果 `panel_url=https://api.example.com/heki`，那么 5 个公开接口分别是：

- `GET /api/v1/nodes/{node_id}`
- `GET /api/v1/nodes/{node_id}/users`
- `POST /api/v1/nodes/{node_id}/traffic`
- `POST /api/v1/nodes/{node_id}/alive-ips`
- `POST /api/v1/nodes/{node_id}/status`

### 3.2 鉴权

heki 使用 Bearer 鉴权：

```http
Authorization: Bearer <panel_key>
```

缺少或错误的 `panel_key`，建议返回 `401 Unauthorized`。

### 3.3 请求头

| Header | 是否发送 | 说明 |
|---|---|---|
| `Authorization` | 总是 | Bearer 鉴权 |
| `Accept: application/json, application/problem+json` | 总是 | 表示同时接受正常 JSON 和 RFC 7807 错误体 |
| `User-Agent: heki` | 总是 | 默认客户端标识 |
| `X-Heki-Node-Id` | 总是 | 与路径中的 `node_id` 对应，便于日志、审计、中间件透传 |
| `X-Heki-Requested-Protocol` | 可选 | heki 当前本地配置中的 `server_type` 提示值，GET 和 POST 都可能发送 |
| `If-None-Match` | 仅 GET 且命中缓存时 | 条件请求头，配合 `ETag` 使用 |

### 3.4 Content-Type 与响应包装

推荐约定：

- 成功响应：`application/json`
- 错误响应：`application/problem+json`
- POST 请求体：`application/json`

标准成功响应建议统一使用外层 `data` 包装：

```json
{
  "data": { }
}
```

或：

```json
{
  "data": []
}
```

兼容说明：

- 对外公开实现建议始终返回标准 envelope，也就是 `{ "data": ... }`
- 当前 heki 客户端也兼容 GET 接口直接返回原始对象 / 原始数组，但这是兼容行为，不建议作为公开规范长期使用

### 3.5 缓存

`GET` 接口建议实现 `ETag` / `If-None-Match`：

1. 服务端首次返回 `ETag`
2. heki 下次请求会带 `If-None-Match`
3. 若数据未变，服务端返回 `304 Not Modified`
4. heki 会复用本地缓存的最近一次成功 payload

当前 heki 会对以下接口使用条件请求：

- `GET /api/v1/nodes/{node_id}`
- `GET /api/v1/nodes/{node_id}/users`

### 3.6 错误响应

推荐使用 RFC 7807 的 `application/problem+json`：

```json
{
  "type": "https://api.example.com/problems/node-not-found",
  "title": "Node not found",
  "status": 404,
  "detail": "node_id=7 does not exist"
}
```

推荐字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `type` | `string` | 问题类型 URI |
| `title` | `string` | 简短错误标题 |
| `status` | `integer` | HTTP 状态码 |
| `detail` | `string` | 便于定位问题的详细描述 |

### 3.7 状态码约定

| 场景 | 建议状态码 |
|---|---|
| 成功返回节点或用户数据 | `200 OK` |
| POST 成功且无需返回实体 | `204 No Content` |
| POST 成功并返回轻量确认对象 | `200 OK` |
| 条件请求命中缓存 | `304 Not Modified` |
| 缺少或错误的 `panel_key` | `401 Unauthorized` |
| `node_id` 不存在 | `404 Not Found` |
| 请求体非法 | `422 Unprocessable Entity` |
| 服务端暂时不可用 | `503 Service Unavailable` |

### 3.8 接口总览

| 方法 | 路径 | 用途 |
|---|---|---|
| `GET` | `/api/v1/nodes/{node_id}` | 获取节点配置 |
| `GET` | `/api/v1/nodes/{node_id}/users` | 获取用户列表 |
| `POST` | `/api/v1/nodes/{node_id}/traffic` | 上报流量 |
| `POST` | `/api/v1/nodes/{node_id}/alive-ips` | 上报在线 IP |
| `POST` | `/api/v1/nodes/{node_id}/status` | 上报节点状态 |

## 4. 数据模型

### 4.1 Node 对象

`GET /api/v1/nodes/{node_id}` 的 `data` 是一个节点对象。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `protocol` | `string` | 是 | 节点协议。规范值见下表 |
| `listen` | `object` | 是 | 监听配置 |
| `limits` | `object` | 否 | 节点限速和倍率 |
| `scheduler` | `object` | 否 | 覆盖 heki 本地同步 / 上报周期 |
| `transport` | `object` | 否 | 传输层配置 |
| `security` | `object` | 否 | TLS / Reality 等安全层配置 |
| `protocol_settings` | `object` | 否 | 协议私有字段 |
| `runtime` | `object` | 否 | 路由、DNS、自定义出口等高级能力 |

#### `protocol`

公开规范建议使用这些 canonical 值：

- `vmess`
- `vless`
- `ss`
- `ssr`
- `trojan`
- `hysteria`
- `tuic`
- `anytls`
- `naive`
- `mieru`

兼容说明：

- `hysteria` 表示 Hysteria2
- 当前 heki 客户端还兼容这些旧别名，但公开实现仍建议统一写 canonical 值：
  - `v2ray -> vmess`
  - `shadowsocks -> ss`
  - `shadowsocksr -> ssr`
  - `hysteria2 -> hysteria`

#### `listen`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `port` | `integer` | 是 | 监听端口，必须大于 0 |
| `ip` | `string` | 否 | 监听 IP；省略时由 heki 使用本地默认监听策略 |

#### `limits`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `speed_mbps` | `number` | 否 | 节点总限速 |
| `traffic_rate` | `number` | 否 | 流量倍率，默认 `1.0` |

#### `scheduler`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `pull_interval_seconds` | `integer` | 否 | 拉取节点 / 用户的周期 |
| `push_interval_seconds` | `integer` | 否 | 上报流量 / 状态的周期 |
| `node_report_min_traffic_kb` | `integer` | 否 | 节点流量上报阈值 |
| `device_online_min_traffic_kb` | `integer` | 否 | 在线设备统计阈值 |

#### `transport`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `type` | `string` | 否 | 传输类型 |
| `path` | `string` | 否 | `ws` / `httpupgrade` / `h2` / `splithttp` 常用 |
| `host` | `string` | 否 | 传输层 Host |
| `service_name` | `string` | 否 | `grpc` 常用 |

`transport.type` 支持值：

| 值 | 说明 |
|---|---|
| `tcp` | 纯 TCP |
| `ws` | WebSocket |
| `httpupgrade` | HTTP Upgrade |
| `h2` | HTTP/2 |
| `grpc` | gRPC |
| `xhttp` | 兼容写法，heki 运行时会规范化为 `splithttp` |
| `splithttp` | Split HTTP / XHTTP 运行时标准值 |

#### `security`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `mode` | `string` | 否 | `none` / `tls` / `reality` |
| `server_name` | `string` | 否 | SNI / Host 提示值 |
| `allow_insecure` | `boolean` | 否 | 是否允许不安全证书 |
| `reject_unknown_sni` | `boolean` | 否 | 是否拒绝未知 SNI |
| `certificate` | `object` | 否 | 证书配置 |
| `reality` | `object` | 否 | Reality 配置 |

`security.mode` 约束：

- `vmess` 仅支持 `none` / `tls`
- `vless`、`trojan` 支持 `none` / `tls` / `reality`
- `naive` 推荐 `tls`
- `anytls` / `hysteria` / `tuic` 一般由协议自身决定 TLS 行为，不要求额外声明

#### `security.certificate`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `mode` | `string` | 否 | 常见值 `http` / `dns` / `self` / `content` |
| `domain` | `string` | 否 | 自动申请证书时使用 |
| `cert_file` | `string` | 否 | 证书文件路径 |
| `key_file` | `string` | 否 | 私钥文件路径 |
| `acme_server` | `string` | 否 | ACME 服务，例如 `letsencrypt`、`zerossl` 或目录 URL |
| `provider` | `string` | 否 | DNS 证书申请提供商，例如 `dns_cf` |
| `dns_env` | `object` | 否 | DNS 验证所需环境变量对象 |
| `public_key_pem` | `string` | 否 | `mode=content` 时的证书内容 |
| `private_key_pem` | `string` | 否 | `mode=content` 时的私钥内容 |

#### `security.reality`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `private_key` | `string` | 否 | Reality 私钥 |
| `server_name` | `string` | 否 | 单个 server name |
| `server_names` | `string[]` | 否 | 多个 server name |
| `short_id` | `string` | 否 | 单个 short id |
| `short_ids` | `string[]` | 否 | 多个 short id |
| `dest` | `string` | 否 | Reality 目标地址，例如 `www.example.com:443` |

#### `protocol_settings`

| 协议 | 常用字段 | 说明 |
|---|---|---|
| `vmess` | 无额外标准必填字段 | 一般配合 `transport` / `security` 使用 |
| `vless` | `flow`、`encryption`、`decryption` | `flow=""` 或 `flow="none"` 都表示未启用 flow；`decryption` 用于 heki 运行时 |
| `ss` | `cipher`、`server_key`、`obfs`、`obfs_host`、`obfs_path`、`plugin`、`plugin_opts` | `cipher` 必填 |
| `ssr` | `method`、`password`、`protocol`、`protocol_param`、`obfs`、`obfs_param`、`single_port_type` | `method` / `password` / `protocol` / `obfs` 必填 |
| `hysteria` | `up_mbps`、`down_mbps`、`obfs`、`obfs_password` | Hysteria2 用这个协议名；`obfs="none"` 表示关闭 Salamander |
| `tuic` | `congestion_control`、`alpn`、`auth_timeout`、`heartbeat`、`zero_rtt_handshake` | 根据需要填写 |
| `anytls` | `padding_scheme` | AnyTLS 私有字段 |
| `mieru` | `transport`、`multiplexing`、`traffic_pattern` | Mieru 私有字段 |

兼容说明：

- VLESS `flow` 只有 `xtls-rprx-vision` 会启用 Vision；空字符串和 `none` 都会被 heki 视为未启用 flow。
- Hysteria2 混淆只支持 `obfs=salamander` 且同时提供 `obfs_password`；`obfs=none` 会明确关闭混淆，不会继承本地旧的 `hysteria_obfs_type`。
- AnyTLS ECH 需要返回真实 keyset，例如 `ech_server_keys`、`ech_key` 或启用状态下的 `tls.ech.key`。只有 `ech_enable`、`ech_server_name` 这类元数据不会被当成服务端 ECH keyset。

#### SS 插件字段约定

对 `ss` 节点，推荐同时返回两类字段：

| 字段组 | 说明 |
|---|---|
| `plugin`、`plugin_opts` | 原始插件表达，适合保留真实语义 |
| `obfs`、`obfs_host`、`obfs_path`、`v2ray_plugin_*`、`shadow_tls_*` | 展开后的兼容字段，便于调试和和其它面板风格对齐 |

这样做的好处：

- 文档可读性更强
- 联调更容易定位问题
- 你的后端、OpenAPI、示例配置和面板兼容字段更容易共用同一套表达

当前 heki 也兼容仅返回 `plugin` / `plugin_opts`，但公开接口仍建议一起返回兼容字段。

#### `runtime`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `routes` | `array` | 否 | 运行时路由规则 |
| `dns_rules` | `array` | 否 | 运行时 DNS 规则 |
| `custom_outbounds` | `array` | 否 | 自定义出口 |
| `custom_routes` | `array` | 否 | 自定义路由 |

### 4.2 User 对象

`GET /api/v1/nodes/{node_id}/users` 的 `data` 是用户对象数组。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `integer` | 是 | 用户 ID |
| `uuid` | `string` | 否 | VMess / VLESS 等常用 |
| `password` | `string` | 否 | SS / SSR / Trojan / Hysteria2 / AnyTLS / Naive 常用 |
| `method` | `string` | 否 | SS / SSR 加密方式 |
| `port` | `integer` | 否 | SSR 或载体用户场景可用 |
| `is_multi_user` | `integer` | 否 | 是否多用户端口 |
| `protocol` | `string` | 否 | SSR 场景可用 |
| `protocol_param` | `string` | 否 | SSR 场景可用 |
| `obfs` | `string` | 否 | SSR 场景可用 |
| `obfs_param` | `string` | 否 | SSR 场景可用 |
| `speed_limit_mbps` | `number` | 否 | 用户限速 |
| `device_limit` | `integer` | 否 | 用户设备 / IP 限制 |
| `upload_bytes` | `integer` | 否 | 已上传字节数 |
| `download_bytes` | `integer` | 否 | 已下载字节数 |
| `transfer_enable_bytes` | `integer` | 否 | 总流量限制 |
| `expired_at_unix` | `integer` | 否 | 过期时间 Unix 时间戳 |
| `banned` | `boolean` | 否 | 是否封禁 |
| `enabled` | `boolean` | 否 | 是否启用 |
| `disabled` | `boolean` | 否 | 是否禁用 |

返回空用户列表时，建议明确返回：

```json
{
  "data": []
}
```

### 4.3 上报模型

#### `traffic` 请求体

```json
{
  "records": [
    {
      "user_id": 1,
      "u": 1024,
      "d": 2048
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `records` | `array` | 是 | 流量记录数组，至少 1 条 |
| `records[].user_id` | `integer` | 是 | 用户 ID |
| `records[].u` | `integer` | 是 | 上传字节数 |
| `records[].d` | `integer` | 是 | 下载字节数 |

#### `alive-ips` 请求体

```json
{
  "records": [
    {
      "user_id": 1,
      "ips": ["1.2.3.4", "5.6.7.8"]
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `records` | `array` | 是 | 在线 IP 记录数组，至少 1 条 |
| `records[].user_id` | `integer` | 是 | 用户 ID |
| `records[].ips` | `string[]` | 是 | 当前在线 IP 列表，至少 1 个 IP |

#### `status` 请求体

```json
{
  "reported_at": "2026-04-25T12:34:56Z",
  "cpu_percent": 23.5,
  "uptime_seconds": 123456,
  "load": {
    "raw": "0.23 0.19 0.11",
    "one": 0.23,
    "five": 0.19,
    "fifteen": 0.11
  },
  "memory": {
    "total_bytes": 1073741824,
    "used_bytes": 536870912
  },
  "swap": {
    "total_bytes": 0,
    "used_bytes": 0
  },
  "disk": {
    "total_bytes": 10737418240,
    "used_bytes": 2147483648
  }
}
```

## 5. GET /api/v1/nodes/{node_id}

获取单个节点配置。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `node_id` | `integer` | 是 | 节点 ID |

### 请求示例

```bash
curl -i \
  -H 'Authorization: Bearer your-api-key' \
  -H 'Accept: application/json, application/problem+json' \
  -H 'X-Heki-Node-Id: 1' \
  -H 'X-Heki-Requested-Protocol: vless' \
  https://api.example.com/heki/api/v1/nodes/1
```

带缓存的请求示例：

```bash
curl -i \
  -H 'Authorization: Bearer your-api-key' \
  -H 'If-None-Match: "node-etag-value"' \
  https://api.example.com/heki/api/v1/nodes/1
```

### `200 OK` 响应示例

```json
{
  "data": {
    "protocol": "vless",
    "listen": {
      "port": 443,
      "ip": "0.0.0.0"
    },
    "limits": {
      "speed_mbps": 0,
      "traffic_rate": 1.0
    },
    "scheduler": {
      "pull_interval_seconds": 60,
      "push_interval_seconds": 60
    },
    "transport": {
      "type": "ws",
      "path": "/edge",
      "host": "cdn.example.com"
    },
    "security": {
      "mode": "tls",
      "server_name": "edge.example.com",
      "certificate": {
        "mode": "self",
        "domain": "edge.example.com"
      }
    },
    "protocol_settings": {
      "flow": "",
      "decryption": "none"
    },
    "runtime": {
      "routes": [],
      "dns_rules": [],
      "custom_outbounds": [],
      "custom_routes": []
    }
  }
}
```

### `304 Not Modified`

仅用于 GET 接口，无响应体也可以。

### 常见错误

- `401`：Bearer token 缺失或错误
- `404`：`node_id` 不存在
- `422`：返回体结构非法或关键字段缺失
- `503`：服务端暂时不可用

## 6. GET /api/v1/nodes/{node_id}/users

获取当前节点对应的用户列表。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `node_id` | `integer` | 是 | 节点 ID |

### 请求示例

```bash
curl -i \
  -H 'Authorization: Bearer your-api-key' \
  -H 'Accept: application/json, application/problem+json' \
  -H 'X-Heki-Node-Id: 1' \
  https://api.example.com/heki/api/v1/nodes/1/users
```

### `200 OK` 响应示例

```json
{
  "data": [
    {
      "id": 1,
      "uuid": "701534e1-8540-49f3-87af-71680a1b97ff",
      "password": "optional-password",
      "method": "aes-256-gcm",
      "speed_limit_mbps": 0,
      "device_limit": 0,
      "upload_bytes": 0,
      "download_bytes": 0,
      "transfer_enable_bytes": 0,
      "expired_at_unix": 0,
      "enabled": true
    }
  ]
}
```

### `304 Not Modified`

如果用户列表未变，建议返回 `304`。

### 常见错误

- `401`：Bearer token 缺失或错误
- `404`：`node_id` 不存在
- `422`：返回体不是数组或用户对象缺少关键字段
- `503`：服务端暂时不可用

## 7. POST /api/v1/nodes/{node_id}/traffic

上报用户流量。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `node_id` | `integer` | 是 | 节点 ID |

### 请求示例

```bash
curl -i \
  -X POST \
  -H 'Authorization: Bearer your-api-key' \
  -H 'Content-Type: application/json' \
  -H 'X-Heki-Node-Id: 1' \
  -H 'X-Heki-Requested-Protocol: ss' \
  -d '{
    "records": [
      {
        "user_id": 1,
        "u": 1024,
        "d": 2048
      }
    ]
  }' \
  https://api.example.com/heki/api/v1/nodes/1/traffic
```

### 成功响应

推荐二选一：

- `204 No Content`
- `200 OK` + 空对象或轻量确认对象

例如：

```json
{
  "ok": true
}
```

### 常见错误

- `401`：Bearer token 缺失或错误
- `404`：`node_id` 不存在
- `422`：请求体不是合法 JSON，或 `records` 缺失 / 非数组 / 为空数组 / 非法
- `503`：服务端暂时不可用

## 8. POST /api/v1/nodes/{node_id}/alive-ips

上报当前用户在线 IP。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `node_id` | `integer` | 是 | 节点 ID |

### 请求示例

```bash
curl -i \
  -X POST \
  -H 'Authorization: Bearer your-api-key' \
  -H 'Content-Type: application/json' \
  -H 'X-Heki-Node-Id: 1' \
  -d '{
    "records": [
      {
        "user_id": 1,
        "ips": ["1.2.3.4", "5.6.7.8"]
      }
    ]
  }' \
  https://api.example.com/heki/api/v1/nodes/1/alive-ips
```

### 成功响应

推荐二选一：

- `204 No Content`
- `200 OK` + 空对象或轻量确认对象

### 常见错误

- `401`：Bearer token 缺失或错误
- `404`：`node_id` 不存在
- `422`：请求体非法，或 `records` / `ips` 为空
- `503`：服务端暂时不可用

## 9. POST /api/v1/nodes/{node_id}/status

上报节点运行状态。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `node_id` | `integer` | 是 | 节点 ID |

### 请求示例

```bash
curl -i \
  -X POST \
  -H 'Authorization: Bearer your-api-key' \
  -H 'Content-Type: application/json' \
  -H 'X-Heki-Node-Id: 1' \
  -d '{
    "reported_at": "2026-04-25T12:34:56Z",
    "cpu_percent": 23.5,
    "uptime_seconds": 123456,
    "load": {
      "raw": "0.23 0.19 0.11",
      "one": 0.23,
      "five": 0.19,
      "fifteen": 0.11
    },
    "memory": {
      "total_bytes": 1073741824,
      "used_bytes": 536870912
    },
    "swap": {
      "total_bytes": 0,
      "used_bytes": 0
    },
    "disk": {
      "total_bytes": 10737418240,
      "used_bytes": 2147483648
    }
  }' \
  https://api.example.com/heki/api/v1/nodes/1/status
```

### 成功响应

推荐二选一：

- `204 No Content`
- `200 OK` + 空对象或轻量确认对象

### 常见错误

- `401`：Bearer token 缺失或错误
- `404`：`node_id` 不存在
- `422`：请求体非法或为空对象
- `503`：服务端暂时不可用

## 10. 兼容性与演进约束

### 10.1 公开规范建议

如果你要长期公开这套接口，建议遵守这些约束：

- 路径固定为 `/api/v1/...`
- 已发布字段不做破坏性删除或重命名
- 新增字段必须保持可选
- 新协议或重大语义变化通过 `v2` 路径发布
- 对外文档、OpenAPI 和真实返回字段保持同步

### 10.2 heki 当前的兼容解析

当前 heki 客户端在实现层还兼容一部分历史别名，用于降低接入成本，例如：

- 协议别名：`v2ray`、`shadowsocks`、`shadowsocksr`、`hysteria2`
- 节点字段别名：`listen_ip`、`base_config`、`protocolConfig`、`dnsRules`
- 用户字段别名：`u`、`d`、`transfer_enable`、`expired_at`、`enable`

这些兼容行为是为了联调和迁移更平滑，不建议把它们当作长期公开规范来宣传。公开文档仍建议统一使用 OpenAPI 中的 canonical 字段名。

### 10.3 高级能力

`runtime.custom_outbounds` / `runtime.custom_routes` 属于高级能力；如果你的后台暂时不支持，返回空数组即可。

## 11. 建议实现顺序

如果你第一次接入 heki，建议按这个顺序推进：

1. `GET /api/v1/nodes/{node_id}`
2. `GET /api/v1/nodes/{node_id}/users`
3. `POST /api/v1/nodes/{node_id}/traffic`
4. `POST /api/v1/nodes/{node_id}/alive-ips`
5. `POST /api/v1/nodes/{node_id}/status`

先把 `protocol`、`listen.port`、用户同步和流量上报跑通，再逐步补 `runtime`、证书内容下发、Reality、SS2022 `server_key` 等高级字段，会更稳。

## 12. 参考实现与真实联调

仓库已经提供了可直接运行的参考后端和真实联调测试：

- 参考后端：`examples/heki-v1-server`
- 使用说明：[heki-v1 参考后端与联调](heki-v1-example-server.md)
- 真实联调测试：
  - `TestRealHekiV1ExampleServerSSIntegration`
  - `TestRealHekiV1ExampleServerShadowTLSIntegration`

如果你要给第三方模板、控制面或魔改后端适配 heki，建议先跑一遍参考后端，再对照 OpenAPI 和本文档逐步替换成你的正式实现。
