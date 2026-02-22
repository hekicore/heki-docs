# 不使用 docker 启动多实例

# 安装&更新 heki

```
bash <(curl -Ls https://raw.githubusercontent.com/hekicore/heki/master/install.sh)
```

# 说明

heki 支持`配置文件`、`命令行参数`和`环境变量`的方式进行配置。

命令行参数以 `--key=value` 的形式传递给 heki，同时也会读取 **/etc/heki/heki.conf** 配置文件的内容。

或者也可以使用 `-c /etc/heki/heki.conf` 的形式来指定配置文件路径，让多个 heki 实例读取不一样的配置文件。

配置优先级：`命令行参数` > `环境变量` > `配置文件`

以下是启动示例，根据你自己的实际情况增加、修改配置参数，[heki 配置详细说明](heki/heki-config.md)：

```
/usr/local/heki/heki \
--type=sspanel-uim \
--webapi_url=https://xxx.com/ \
--webapi_key=asdasd \
--node_id=1 \
--cert_domain=aaaa.com \
--cert_mode=http \
```

以下是使用自定义配置文件的方式启动：

```
/usr/local/heki/heki -c /etc/heki/heki1.conf
```

# 后台运行

直接使用上述命令会让 heki 前台运行，若关闭当前 ssh 连接，heki 进程也会终止，所以需要将 heki 运行在后台中，具体方式有 nohup、screen 等启动方式，请自行学习这些工具的使用。

# screen 基本使用

更多 screen 用法请网上搜索教程

```
screen -R heki1                    # 进入名字为 heki1 的 screen 窗口，若不存在，则自动创建
screen -ls                         # 查看已创建的 screen 窗口
ctrl + a，然后全松开，再按 d          # 离开当前 screen 窗口
ctrl + a，然后全松开，再按 Esc        # 此时可以用滚轮上下查看日志
exit                               # 退出并关闭当前 screen 窗口
```

# 使用 systemd 多实例

heki 安装时自带 `heki@.service` 模板，可以方便地启动多个实例：

```
# 创建第二个实例的配置文件
cp /etc/heki/heki.conf /etc/heki/heki2.conf
# 编辑配置
vim /etc/heki/heki2.conf

# 启动第二个实例
systemctl start heki@heki2
systemctl enable heki@heki2

# 查看日志
journalctl -u heki@heki2 -f
```
