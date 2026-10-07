# 内存与 pprof 排查

Heki 内置 pprof 调试接口，默认监听 `127.0.0.1:6060`，可用于排查内存、goroutine、CPU 热点等问题。

如果启动日志里出现 `pprof enabled on ...`，请以日志中的实际地址为准；当默认端口被占用或配置了 `pprof_addr` 时，端口可能不是 `6060`。

## 一键诊断

在服务器 SSH 终端执行：

```bash
echo "========== Heki 内存诊断 =========="
echo "--- 进程信息 ---"
systemctl status heki | grep -E "Memory|Active|Main PID"
echo ""
echo "--- 进程详情 ---"
ps -p $(pidof heki) -o pid,rss,vsz,etime --no-headers 2>/dev/null | awk '{printf "PID: %s | RSS: %.1fMB | VSZ: %.1fMB | 运行时间: %s\n", $1, $2/1024, $3/1024, $4}'
echo ""
echo "--- 堆内存概况 ---"
curl -s 'http://localhost:6060/debug/pprof/heap?debug=1' | head -1
echo ""
echo "--- 堆内存 Top 分配 ---"
curl -s 'http://localhost:6060/debug/pprof/heap?debug=1' | head -30
echo ""
echo "--- Goroutine 总数 ---"
curl -s 'http://localhost:6060/debug/pprof/goroutine?debug=1' | head -1
echo ""
echo "--- Goroutine Top 类型 ---"
curl -s 'http://localhost:6060/debug/pprof/goroutine?debug=1' | grep -E "^[0-9]+ @" | sort -rn | head -10
echo ""
echo "--- MemStats 关键指标 ---"
curl -s 'http://localhost:6060/debug/pprof/heap?debug=2' | grep -E "^# (Alloc|Sys|HeapInuse|HeapIdle|HeapReleased|NumGC|GCCPUFraction) ="
echo ""
echo "========== 诊断完成 =========="
```

Docker bridge 网络模式下，如果宿主机访问不到 `localhost:6060`，请进入容器内执行：

```bash
docker exec -it heki sh
curl -s 'http://localhost:6060/debug/pprof/heap?debug=1' | head -1
```

## 快速判断

```bash
# 查看服务内存
systemctl status heki | grep Memory

# 查看 RSS / VSZ / 运行时间
ps -p $(pidof heki) -o pid,rss,vsz,etime --no-headers | awk '{printf "PID: %s | RSS: %.1fMB | VSZ: %.1fMB | 运行时间: %s\n", $1, $2/1024, $3/1024, $4}'

# 确认 pprof 可访问
curl -s http://localhost:6060/debug/pprof/ | head -3
```

`RSS` 是实际物理内存占用，`VSZ` 是虚拟内存。Go 程序的 `VSZ` 偏大通常不是问题，排查时重点看 `RSS`、`Alloc`、`HeapInuse` 和 goroutine 数是否持续增长。

## 堆内存

```bash
# 当前堆内存摘要
curl -s 'http://localhost:6060/debug/pprof/heap?debug=1' | head -1

# 当前堆内存 Top 分配
curl -s 'http://localhost:6060/debug/pprof/heap?debug=1' | grep -E "^[0-9]" | head -20

# 保存文本版 heap
curl -s 'http://localhost:6060/debug/pprof/heap?debug=1' > /tmp/heap_$(date +%Y%m%d_%H%M).txt

# 查看 runtime.MemStats 摘要
curl -s 'http://localhost:6060/debug/pprof/heap?debug=2' | tail -30
```

常看字段：

| 字段 | 含义 |
|---|---|
| `Alloc` | 当前堆上仍在使用的内存 |
| `TotalAlloc` | 启动以来累计分配，只增不减，不能单独当泄漏依据 |
| `Sys` | Go runtime 从系统申请的总内存 |
| `HeapInuse` | 堆上正在使用的 span 内存 |
| `HeapIdle` | 堆上空闲但暂未归还系统的内存 |
| `HeapReleased` | 已归还给系统的内存 |
| `NumGC` | GC 执行次数，持续增长是正常现象 |

## Goroutine

```bash
# goroutine 总数
curl -s 'http://localhost:6060/debug/pprof/goroutine?debug=1' | head -1

# 按类型统计 goroutine 数量
curl -s 'http://localhost:6060/debug/pprof/goroutine?debug=1' | grep -E "^[0-9]+ @" | sort -rn | head -20

# 保存完整 goroutine 堆栈
curl -s 'http://localhost:6060/debug/pprof/goroutine?debug=2' > /tmp/goroutine_$(date +%Y%m%d_%H%M).txt
```

如果 goroutine 数持续增长且长时间不回落，通常需要进一步看完整堆栈，确认是否有连接关闭后仍阻塞在读写、channel 等待或 relay 收口路径。

## 对比两次 heap

排查泄漏最有效的方式是间隔一段时间采集两份 heap：

```bash
# 第一次
curl -s 'http://localhost:6060/debug/pprof/heap?gc=1' > /tmp/heap1.pb.gz

# 间隔 10 分钟、1 小时或等待内存继续上涨后

# 第二次
curl -s 'http://localhost:6060/debug/pprof/heap?gc=1' > /tmp/heap2.pb.gz
```

如果本地电脑安装了 Go，可以下载这两份文件后对比：

```bash
go tool pprof -http=:8080 -diff_base=/tmp/heap1.pb.gz /tmp/heap2.pb.gz
```

也可以直接查看第二份当前占用：

```bash
go tool pprof -top -sample_index=inuse_space /tmp/heap2.pb.gz
```

## CPU profile 不是内存 profile

如果 `pprof top` 里显示的是 `49.99s`、`70.30s total` 这类秒数，它是 CPU profile，不是内存 profile。

CPU profile 常用于看加密、网络读写、锁竞争等热点；判断内存泄漏请提供 `heap` 和 `goroutine`。

## 需要提交给开发的信息

排查内存问题时，建议至少提供：

- 一键诊断输出
- `/tmp/heap1.pb.gz` 和 `/tmp/heap2.pb.gz`
- `/tmp/goroutine_*.txt`
- 问题发生时的协议类型、在线人数、是否有大流量下载或测速
- `systemctl status heki` 或 Docker 容器状态截图
