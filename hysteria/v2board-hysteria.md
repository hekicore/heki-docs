# V2board 对接 hysteria

!> 原版 V2Board 的实际兼容性取决于面板分支返回的 API 字段。若你的面板未返回 hysteria 所需字段，建议优先使用 XBoard / PPanel。

# 第一步，在面板添加一个节点

非常简单，教程省略

# 第二步，配置 heki

!> hysteria 必须要配置证书！！！

参考: [heki 详细配置项](heki/heki-config.md)

# 第三步，启动 heki

```
heki start
```

若出现启动失败的情况，使用`heki log`查看错误信息
