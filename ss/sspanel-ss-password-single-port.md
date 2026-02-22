# SSPanel 对接 ss 密码单端口

> 使用 ss 密码单端口必看: [ss 密码单端口优化](other/ss-aead.md)

> 不支持同一节点下与混淆单端口或协议单端口并存，请分开运行

# 密码单端口

支持以下配置，均使用 ss 客户端连接

| 加密                      | 协议     | 混淆    |
|-------------------------|--------|-------|
| aes-128-gcm             | origin | plain |
| aes-192-gcm             | origin | plain |
| aes-256-gcm             | origin | plain |
| chacha20-ietf-poly1305  | origin | plain |
| -                       |        |       |
| 2022-blake3-aes-128-gcm | origin | plain |
| 2022-blake3-aes-256-gcm | origin | plain |

# 第一步，添加一个单端口承载节点

> 该节点不是一个真实节点，仅仅是给单端口做配置的

在面板中添加一个承载节点，节点地址填写一个端口，表示 ss 的单端口

# 第二步，添加一个单端口承载用户

> 该用户不是一个真实用户，仅仅是给单端口做配置的

在面板中添加一个承载用户，配置对应的加密方式和密码

# 第三步，添加一个正常的 Shadowsocks 节点

## 节点地址格式

```
连接IP或域名;port=必填承载节点配置的端口#用户连接端口
```

示例

> 该示例中，heki 监听 12345 端口，用户连接23456端口

```
hk.aaa.com;port=12345#23456
```

# 第四步，配置 heki

参考: [heki 详细配置项](heki/heki-config.md)

# 第五步，启动 heki

```
heki start
```

若出现启动失败的情况，使用`heki log`查看错误信息
