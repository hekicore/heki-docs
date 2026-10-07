# 运行时性能调优

heki 已针对代理场景做了优化，开箱即用。如需进一步调优，可通过环境变量控制。heki 不会自动修改这些值，完全由用户决定。

## 参数说明

| 参数名 | 默认值 | 说明 |
|--------|--------|------|
| `GOGC` | `100` | GC 触发阈值。值越小 GC 越频繁、内存越低，但 CPU 开销略增 |
| `GOMEMLIMIT` | 无 | 内存软上限（如 `400MiB`）。接近限制时自动加速 GC，防止 OOM |
| `GOMAXPROCS` | CPU 核心数 | 最大并行线程数。一般不需要改 |

### GOGC

控制 GC 触发频率。默认 `100` 表示堆内存增长到存活对象的 2 倍时触发回收。值越小回收越频繁、内存越低，但 CPU 开销略增。

### GOMEMLIMIT

内存软上限。接近这个值时 GC 自动加速，不管 GOGC 怎么设的都会强制回收。不是硬限制，极端情况可能短暂超出。建议设为物理内存的 80% 左右，给系统留余量。

### GOMAXPROCS

默认等于 CPU 核心数，绝大多数情况不需要改。只有在同一台机器跑多个 heki 实例、想限制单实例 CPU 占用时才考虑设置。

---

## 推荐配置

| VPS 内存 | GOGC | GOMEMLIMIT | 适用场景 |
|----------|------|------------|---------|
| 512MB | `50` | `400MiB` | 小内存，积极回收防 OOM |
| 1GB | `100` | `800MiB` | 中等规模，平衡内存和 CPU |
| 2GB+ | `200` | `1600MiB` | 高并发，减少 GC 提升吞吐 |

> `GOMAXPROCS` 保持默认，不需要设置。

---

## 性能对比

以 100 个活跃用户为例，不同配置下的内存占用参考：

| 配置 | 内存占用 | CPU 开销 | 说明 |
|------|---------|---------|------|
| 默认（不配置） | ~500MB | 低 | 内置优化已生效 |
| GOGC=50 | ~370MB | 略增 | 内存降低约 25% |
| GOGC=50 + GOMEMLIMIT=400MiB | ~320MB | 略增 | 内存降低约 35%，兜底防 OOM |
| GOGC=200 | ~700MB | 更低 | 适合大内存机器，GC 更少 |

500 用户参考：

| 配置 | 内存占用 |
|------|---------|
| 默认 | ~2.2GB |
| GOGC=50 | ~1.6GB |
| GOGC=50 + GOMEMLIMIT | ~1.3GB |

> 以上为估算值，实际取决于并发连接数、流量大小、活跃用户比例。非活跃用户几乎不占内存。

---

## 配置方式

以 512MB VPS 为例（`GOGC=50`，`GOMEMLIMIT=400MiB`）：

### 直接启动

```bash
GOGC=50 GOMEMLIMIT=400MiB /usr/local/heki/heki -c /etc/heki/heki.conf
```

### systemd

推荐使用 systemd drop-in 覆盖环境变量：

```bash
sudo systemctl edit heki
```

```ini
[Service]
Environment="GOGC=50"
Environment="GOMEMLIMIT=400MiB"
```

修改后执行：

```bash
sudo systemctl daemon-reload
sudo systemctl restart heki
```

> 不要把 `ExecStart` 改成 `heki start`。默认 service 直接执行的是 `/usr/local/heki/heki -c /etc/heki/heki.conf`。

### Docker

```yaml
environment:
  - GOGC=50
  - GOMEMLIMIT=400MiB
```
