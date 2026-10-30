# Hysteria2 网站伪装（Masquerade）

> 2026-10-31 的 v1.2.9 再次同版本重发新增。此前的 1.2.9 安装包和镜像不包含，需要重新执行 `heki update 1.2.9`，或拉取镜像并重建容器。

Masquerade 让 Hy2 的 UDP 监听器对普通 HTTP/3 请求提供网站内容。认证失败的请求也进入同一个伪装处理器；认证成功的 Hy2 TCP/UDP 转发保持原有路径，不经过伪装网站。

默认不开启，仍返回 404。它不使用 `v2ray_fallback_addr/port`，也不直接读取官方 Hysteria 的 YAML。

## 配置位置与优先级

在 `heki.conf` 配置 `hysteria_masquerade`，值为**单行 JSON 对象**。支持同名小写环境变量，环境变量覆盖主文件；节点配置现有的 `[USER]` 用户自定义区可进一步覆盖。

节点覆盖会替换整个 JSON，不合并子字段。删除节点覆盖行可恢复继承；填写 `hysteria_masquerade={}` 或 `{"type":"none"}` 可关闭该节点的伪装。修改配置后重启 Heki；修改静态目录中的网页内容不需要重启。

只对 Hy2 节点生效，与采用 XBoard、XiaoV2Board、PPanel 或其他面板无关；目前配置来自本地或环境变量，不解析面板私有 `masquerade/fallback` 字段。

## 反向代理网站

```ini
hysteria_masquerade={"type":"proxy","proxy":{"url":"https://www.example.com/","rewriteHost":true}}
```

将示例地址替换为实际网站，或者自己的本地 HTTP 服务，如 `http://127.0.0.1:8080/`。Docker 中 `127.0.0.1` 指当前容器，除非使用 host 网络；可通过容器网络服务名访问另一个容器。

| JSON 字段 | 默认值 | 说明 |
|---|---|---|
| `type` | 空 | `proxy`、`file`、`string`；空或 `none` 关闭 |
| `proxy.url` | 必填 | HTTP(S) 目标 URL；支持基础路径和查询参数，不支持账号密码 URL、fragment 或 Unix socket |
| `proxy.rewriteHost` | `false` | 改用目标网站的 Host；大多数公网网站建议设为 `true` |
| `proxy.insecure` | `false` | 是否跳过目标网站的 TLS 证书验证；与 Hy2 客户端验证节点证书无关 |
| `proxy.xForwarded` | `false` | 开启后生成 X-Forwarded-For/Host/Proto；默认不向目标网站提供客户端这些信息 |

反代保留请求方法、路径、查询和正文，只访问配置指定的目标；目标自身的 HTTP 重定向会原样返回。传入的 X-Forwarded 头不会直接信任；`Hysteria-*` 认证/协议头不会传给目标网站。上游 `Alt-Svc` 被移除，避免引导客户端访问目标网站的 QUIC 端口。

上游连接或 TLS 失败、等待响应头超过 15 秒时返回普通 404，不输出 URL 参数或上游错误细节。目标返回的正常 HTTP 状态码会保留。没有新增对已认证用户数据面的压缩、联网检查或额外转发；伪装请求本身会消耗 CPU、连接和带宽，也不计入已认证用户的代理流量。

## 静态文件网站

```ini
hysteria_masquerade={"type":"file","file":{"dir":"/var/www/heki-masquerade"}}
```

把公开网页放入该目录，例如 `index.html`。目录必须存在且 Heki 有权限读取；不存在时该节点启动报错。请求路径和符号链接不能越出该目录。目录没有首页时可能显示目录列表，因此只放准备公开的文件，不要指向 `/etc/heki` 等配置、证书目录。

Docker 需要把网页目录挂载到容器对应路径，建议只读挂载。多个节点可以共用同一个公开目录，也可以分别设置。

## 固定响应

```ini
hysteria_masquerade={"type":"string","string":{"content":"<html><body>Welcome</body></html>","headers":{"Content-Type":"text/html; charset=utf-8"},"statusCode":200}}
```

`string.content` 可为空；换行写 JSON 转义 `\n`。默认状态码 200，默认 Content-Type 为 `text/plain; charset=utf-8`。HEAD 返回同样的状态和头但没有正文；204/304 不发送正文。

状态码范围 200–599，排除 Hy2 认证保留值 233。自定义头不允许 CR/LF、`Hysteria-*` 或 Content-Length/Transfer-Encoding 等报文控制头。未知字段、错误 JSON 或错误 URL 会明确报错；JSON 最大 60 KiB，配置文件中不要分成多行。

## 多节点与 Docker 示例

主配置为所有 Hy2 节点设置一个网站：

```ini
hysteria_masquerade={"type":"proxy","proxy":{"url":"https://www.example.com/","rewriteHost":true}}
```

在 `/etc/heki/nodes/node_12.conf` **现有的 `[USER]` 用户自定义区域内**，添加以下一行，让节点 12 使用自己的页面：

```ini
hysteria_masquerade={"type":"string","string":{"content":"Node 12 website"}}
```

或者在节点 12 写 `hysteria_masquerade={}`，仅让该节点恢复 404。不要修改 `[AUTO]` 区。

Docker Compose 的现有服务中可添加：

```yaml
environment:
  hysteria_masquerade: '{"type":"proxy","proxy":{"url":"https://www.example.com/","rewriteHost":true}}'
```

修改环境变量后执行 `docker compose up -d`；仅重启容器不会更新环境变量。Heki 配置文件和节点文件内直接填写 JSON，不要给整个对象额外加单引号；Compose 的 YAML 示例则需要外层引号。

## 验证与边界

使用支持 HTTP/3 的 curl：

```bash
curl --http3-only https://node.example.com:443/
```

将域名和端口替换为节点实际值，并确保客户端信任节点证书。即使反代目标网站有可信证书，访问者看到的仍是 **Hy2 节点自己的证书**；自签节点需让测试客户端信任该证书。

这里只接入 UDP 上的 HTTP/3 伪装，没有新增官方 `listenHTTP`、`listenHTTPS`、`forceHTTPS` 对应的 TCP 网站监听。普通浏览器可能先访问 TCP 443，不能仅凭普通浏览器访问失败判断伪装失败。若需要 TCP 网站，可单独部署 nginx/Caddy，并确保其 HTTP/3 不占用 Hy2 的 UDP 端口。

启用 Salamander 时，普通浏览器或 HTTP/3 curl 不具备混淆密码，无法直接访问这条 UDP 监听器；Masquerade 不会绕过混淆层。`hysteria_disable_udp` 只关闭认证用户的 UDP 转发，不关闭 Hy2 的 QUIC 监听和 HTTP/3 伪装。

官方参考：[Masquerade 完整配置](https://v2.hysteria.network/zh/docs/advanced/Full-Server-Config/#masquerade)。Heki 当前支持范围以上述配置表为准。
