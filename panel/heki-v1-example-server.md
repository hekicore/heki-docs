# heki-v1 参考后端与联调

> 文档入口： [WebAPI 文档](heki-v1-webapi.md) | [参考后端](heki-v1-example-server.md) | <a href="panel/heki-v1.openapi.yaml" target="_blank" rel="noopener">OpenAPI 规范</a>

## 1. 它是什么

`examples/heki-v1-server` 是仓库里的一个 **开发测试后端**，用来模拟 `heki-v1` 控制面 API。

- 源码路径：`examples/heki-v1-server`
- 启动脚本：`examples/heki-v1-server/run-dev.sh`
- 目录说明：`examples/heki-v1-server/README.md`

它适合：

- 本地联调 `type=heki-v1`
- 第三方后端按文档做适配
- 做最小闭环测试

它不是生产控制面。

## 2. 先分清两个角色

- `heki` 二进制：节点程序，负责请求 API
- `heki-v1` 后端：API 服务端，负责返回节点和用户数据

所以：

- 官方 heki 二进制 **可以**拿来测试 `type=heki-v1`
- 但它**不会自己变成测试后端**
- 测试时还需要一个可访问的 `heki-v1` API 服务端

这个服务端可以是：

- 你的正式后端
- 你的测试后端
- 用户自己实现的后端
- 源码仓库里的 `examples/heki-v1-server`

## 3. 如果用户只有二进制包

如果用户拿到的是 heki 发布二进制，通常**没有** `examples/heki-v1-server` 这个目录。

这很正常。

这时只需要满足一件事：

- 给 heki 一个可访问的 `heki-v1` API 地址

不一定每次都要额外发测试包。只要这个测试后端继续符合 `heki-v1` 规范，就可以继续用。

## 4. 本地联调怎么测

如果你有源码仓库，最方便的方式是直接启动参考后端：

```bash
bash examples/heki-v1-server/run-dev.sh
```

默认地址：

```text
http://127.0.0.1:18080/heki
```

对应 heki 配置：

```ini
type=heki-v1
server_type=vless
node_id=1
panel_url=http://127.0.0.1:18080/heki
panel_key=dev-demo-key
```

说明：

- `server_type` 只是提示值
- 实际启动协议以接口返回的 `protocol` 为准

## 5. 自定义测试数据

```bash
HEKI_V1_EXAMPLE_NODE_ID=7 \
HEKI_V1_EXAMPLE_NODE_FILE=/path/to/node.json \
HEKI_V1_EXAMPLE_USERS_FILE=/path/to/users.json \
bash examples/heki-v1-server/run-dev.sh
```

约定：

- `node.json` 是单个节点对象，不带外层 `data`
- `users.json` 是用户数组，不带外层 `data`

## 6. 常见误区

### `127.0.0.1` 只表示当前机器

- 后端和 heki 在同一台机器上：可以用 `127.0.0.1`
- heki 在 Docker 里：要改成宿主机可达地址
- heki 在另一台机器上：要改成实际 IP 或域名

### 参考后端不是必须品

测试 `heki-v1` 的重点不是一定要跑 `examples/heki-v1-server`，而是：

- heki 能否正确请求这 5 个接口
- 鉴权、缓存、错误体、上报是否正常
- 节点能否按返回配置真正跑起来

## 7. 相关文件

- [heki-v1 WebAPI](heki-v1-webapi.md)
- [OpenAPI 规范](panel/heki-v1.openapi.yaml)
- `examples/heki-v1-server/main.go`
- `examples/heki-v1-server/run-dev.sh`
