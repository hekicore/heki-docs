# Docker 对接教程

# 安装 docker
!> 以下安装方式不一定长期有效，若安装失败，则建议参考官方 docker 安装方式
## CentOS

```
yum install -y yum-utils
yum-config-manager \
    --add-repo \
    https://download.docker.com/linux/centos/docker-ce.repo
yum install docker-ce docker-ce-cli containerd.io -y
systemctl start docker
systemctl enable docker
```

## Ubuntu / Debian

```
sudo apt-get update
sudo apt-get install \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg-agent \
    software-properties-common -y
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) \
   stable"
sudo apt-get install docker-ce docker-ce-cli containerd.io -y
systemctl start docker
systemctl enable docker
```

# 一、使用 docker-compose 运行

## 安装 docker-compose

> 新版 Docker 已内置 `docker compose` 命令（V2），无需单独安装。如果你的 Docker 版本较旧，可手动安装：

```
# 方式一：使用新版 Docker 内置的 compose（推荐）
docker compose version

# 方式二：手动安装 docker-compose（旧版 Docker）
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

## 配置 docker-compose.yml

> 任意目录新建一个 docker-compose.yml 文件，配置以下内容
>
> 也可以直接下载模板：
> ```
> mkdir -p /etc/heki && cd /etc/heki
> curl -sL https://raw.githubusercontent.com/hekicore/heki/master/docker-compose.yml -o docker-compose.yml
> ```

> 推荐使用 `network_mode: host`，自动映射同位端口，提升 udp nat 等级
>
> 在`environment`下添加、修改你自己需要的参数，**以下只是示例**，配置详细说明：[heki 配置详解](heki/heki-config.md)

``` 
version: "3"
services:
  heki:
    image: hekicore/heki:latest
    restart: on-failure
    network_mode: host
    environment:
      type: sspanel-uim
      node_id: 1
      heki_key: xxx
      webapi_url: https://xxx.com/
      webapi_key: xxxxxx
      # force_close_ssl: 'false'              # 填写 false 或 true 参数值时需要加单引号
      # forbidden_bit_torrent: 'true'         # 填写 false 或 true 参数值时需要加单引号
      # 其他配置可自行添加，如果参数值有特殊符号，则加上单引号，避免与 docker 配置文件冲突
    volumes:
      - /etc/heki/:/etc/heki/
```

!> heki 会自动从面板获取协议类型，无需配置 `server_type`

## docker-compose 常用命令

> 需要在 docker-compose.yml 文件同目录下执行
> 
> 新版 Docker 使用 `docker compose`（无横杠），旧版使用 `docker-compose`（有横杠）

``` 
docker compose up                   # 前台启动heki，主要观察日志使用
docker compose up -d                # 后台启动heki，长期运行
docker compose logs --tail=500      # 截取输出最后500行日志
docker compose down                 # 停止并删除容器
docker compose restart              # 重启
docker compose pull                 # 更新
```

## docker-compose 更新流程

> 需要在 docker-compose.yml 文件同目录下执行

``` 
# 首先更新
docker compose pull

# 然后重新加载并重启即可，会自动删除旧容器并启动新更新的镜像
docker compose up -d
```

# 二、使用 docker 命令直接运行

> heki Docker 镜像支持 `linux/amd64` 和 `linux/arm64` 双架构，Docker 会自动拉取对应架构的镜像

## 运行命令示例

> 请自行学习你不熟悉的 docker 参数的具体含义，`这里不是 docker 新手教程`
>
> `--name` 可以为容器起一个名字（可选），运行多个 docker 实例不要同名
>
> `-d` 表示后台运行，若只是想测试，建议去掉 `-d`，前台运行，可实时查看日志
>
> 使用 `-v` 挂载目录（可选），建议挂载，主要目的是挂载证书文件，自动申请的证书将存放在 `/etc/heki/` 目录中
>
> 使用 `--network host` 可自动映射同位端口，提升 udp nat 等级，推荐使用
>
> 使用 `-e key=value` 的形式配置参数，以下配置参数供参考，`根据自己实际情况增加参数、修改参数`等
>
> 配置详细说明：[heki 配置详细说明](heki/heki-config.md)

> 命令中反斜杠 "\\" 后面`不要有空格`

``` 
docker run --restart=on-failure --name heki -d \
-v /etc/heki/:/etc/heki/ --network host \
-e type=sspanel-uim \
-e node_id=1 \
-e heki_key=xxx \
-e webapi_url=https://xxx.com/ \
-e webapi_key=asdasd \
hekicore/heki
```

## docker 常用命令

``` 
docker pull hekicore/heki           # 更新 heki 镜像，更新后记得删除原镜像并重新运行heki
docker ps                           # 查看正在运行的容器
docker ps -a                        # 查看所有容器，包括已运行和未运行的
docker logs name_or_id              # 查看容器日志
docker restart name_or_id           # 重启容器
docker stop name_or_id              # 停止容器
docker start name_or_id             # 启动容器
docker rm name_or_id -f             # 强制删除容器
```

## docker 更新 heki 操作

``` 
# 拉取最新镜像
docker pull hekicore/heki:latest

# 或者指定版本，拉取前自行确认指定版本是否存在
docker pull hekicore/heki:x.x.x

# 强制删除当前正在运行的heki容器，name是你启动时设置的名称
docker rm name -f

# 然后再按照你原来的启动命令启动heki，此处省略
```
