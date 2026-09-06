# XBoard SS 插件订阅修复说明

这篇文档只讲一件事：`Xboard -> heki` 已经能正常起节点，但 `Xboard -> 客户端` 这段订阅内容不完整，导致 SS 插件参数、SS2022 或布尔开关到了客户端就变样了。

先把边界说清楚：

- 对 SS 插件来说，`Xboard -> heki` 这段现在基本没问题，UniProxy `config()` 已经会下发 `plugin` 和 `plugin_opts`；
- heki 这边 `panel/xboard.go`、`config/ss_plugin.go` 也已经能把这些字段接住；
- 真正容易出问题的，主要还是各类客户端订阅模板；
- 只有一个额外例外要记一下：XBoard 当前仍只给 `2022-blake3-aes-128-gcm` 和 `2022-blake3-aes-256-gcm` 返回 `server_key`，`2022-blake3-chacha20-poly1305` 还没补齐。

所以这篇文档的重点不是“heki 怎么解析插件”，而是“为什么面板订阅下发后，客户端看到的内容不对”。

## 先看结论

如果你现在只是想先把业务跑通，可以先记住这几条：

1. 不要把 `flag=shadowsocks` 当成 SS 插件或 SS2022 的主订阅格式。
2. 面板里所有布尔参数尽量都写成 `=true`，比如 `tls=true`、`nocomp=true`、`tcp=true`。
3. 如果你要完整下发 `gost` / 其他 SS 插件，优先用 `flag=general` / `sagernet` / `v2rayn` / `v2rayng`、`flag=shadowrocket`、`flag=sing-box`；`flag=meta` 可以作为次优方案。
4. 如果节点 cipher 用的是 `2022-blake3-chacha20-poly1305`，先给 XBoard 的 `app/Services/ServerService.php` 补上 `server_key` 再联调。

## XBoard 订阅支持矩阵

先把边界说清楚：`heki` 服务端这边已经回归验证过的内置 `gost` 模式包括：

- `websocket`
- `wss`
- `mws`
- `mwss`
- `http2`
- `h2c`
- `grpc`
- `tls`
- `mtls`
- `kcp`
- `pht`
- `phts`
- `quic`

下面这张表讲的是：XBoard 在给客户端下发订阅时，模板能不能把这些模式对应的 `plugin` / `plugin_opts` 表达完整。

| 订阅 flag | 对应模板 | 对 `gost` / SS 插件的完整度 | 结论 |
|---|---|---|---|
| `general` / `v2rayn` / `v2rayng` / `passwall` / `ssrplus` / `sagernet` | `General.php` | 高 | 直接透传整段 `plugin;plugin_opts`，最适合完整下发 `gost` / SS2022 |
| `shadowrocket` | `Shadowrocket.php` | 高 | 直接透传整段 `plugin;plugin_opts`，`obfs` 会自动转成 `obfs-local` |
| `sing-box` / `hiddify` / `sfm` | `SingBox.php` | 高 | 直接输出 `plugin` 和 `plugin_opts` 字段 |
| `meta` | `ClashMeta.php` | 中高 | 会二次解析，但无值 flag 会保留为 `true`，可作为次优方案 |
| `clash` | `Clash.php` | 中 | 只稳定保留 `key=value`，裸 `tls` / `nocomp` / `mux` 会丢 |
| `stash` | `Stash.php` | 中 | 与 `clash` 类似，只稳定保留 `key=value` |
| `surge` | `Surge.php` | 低 | 主要只特判 `obfs`，不适合作为完整 `gost` 主订阅 |
| `loon` | `Loon.php` | 低 | 主要只特判 `obfs`，不适合作为完整 `gost` 主订阅 |
| `quantumultx` | `QuantumultX.php` | 低 | 主要只特判 `obfs`，不适合作为完整 `gost` 主订阅 |
| `surfboard` | `Surfboard.php` | 低 | 主要只特判 `obfs`，不适合作为完整 `gost` 主订阅 |
| `shadowsocks` | `Shadowsocks.php` | 不推荐 | SIP008 不带 `plugin` / `plugin_opts`，也不适合 SS2022 |

## 已确认的订阅问题

### 1. 原始 `flag=shadowsocks` / SIP008 不适合 SS 插件和 SS2022

对应代码：

- `Xboard/app/Protocols/Shadowsocks.php`

这一套现在的行为很简单：

- `handle()` 只放行少数传统 AEAD cipher。
- `SIP008()` 只输出 `id` / `remarks` / `server` / `server_port` / `password` / `method`。
- 没有输出 `plugin` / `plugin_opts`。

这就意味着：

- SS 插件信息不会出现在 SIP008 订阅里。
- SS2022 节点不会进入这个订阅输出。

所以这里没什么优化空间，结论就是：

- 不要把 `flag=shadowsocks` 当成带插件或 SS2022 的主订阅格式。
- 优先用 `flag=general` / `sagernet` / `v2rayn` / `v2rayng`、`flag=shadowrocket`、`flag=sing-box` 这类模板。
- 如果客户端明确要求 Clash 系格式，再优先考虑 `flag=meta` / `flag=stash`，不要直接默认 `flag=clash`。

### 2. `flag=clash` / `flag=stash` 只稳定保留 `key=value`

对应代码位置：

- `Xboard/app/Protocols/Clash.php`
- `Xboard/app/Protocols/Stash.php`

这些文件里都用了类似的解析方式：

```php
collect(explode(';', $pluginOpts))
    ->filter()
    ->mapWithKeys(function ($pair) {
        if (!str_contains($pair, '=')) {
            return [];
        }
        [$key, $value] = explode('=', $pair, 2);
        return [trim($key) => trim($value)];
    })
```

问题就在这里：只要没有 `=`，这一段模板逻辑就直接把参数丢了。

受影响的典型参数有：

- `tls`
- `nocomp`
- `tcp`
- `acknodelay`

最常见的例子就是：

- 你在面板里写 `mode=websocket;tls;host=cdn.example.com;path=/ws`
- heki 节点侧能正常识别
- 但 XBoard 生成 Clash / Stash 订阅时，`tls` 这个 flag 可能被吞掉，客户端拿到的配置就不是 WSS 了

### 3. `flag=meta` 比 `clash` / `stash` 更完整，但仍不是原样透传

对应代码位置：

- `Xboard/app/Protocols/ClashMeta.php`

`ClashMeta.php` 的区别在于：它遇到无值参数时，不是直接丢掉，而是会保留成布尔值：

```php
->mapWithKeys(function ($pair) {
    if (!str_contains($pair, '=')) {
        return [trim($pair) => true];
    }
    [$key, $value] = explode('=', $pair, 2);
    return [trim($key) => trim($value)];
})
```

这意味着：

- 裸 `tls`、`mux`、`nocomp` 不会像 `clash` / `stash` 那样直接消失。
- 但它仍然会按插件类型重新组装 `plugin-opts`，不是原样透传 `plugin_opts`。
- 所以 `flag=meta` 更适合作为第二梯队，而不是替代 `general` / `shadowrocket` / `sing-box` 这类原样透传模板。

### 4. `flag=surge` / `flag=loon` / `flag=quantumultx` / `flag=surfboard` 主要只照顾 `obfs`

对应代码位置：

- `Xboard/app/Protocols/Surge.php`
- `Xboard/app/Protocols/Loon.php`
- `Xboard/app/Protocols/QuantumultX.php`
- `Xboard/app/Protocols/Surfboard.php`

这些模板虽然也会读取 `plugin` / `plugin_opts`，但 `switch ($plugin)` 里基本只处理了 `obfs` 分支，没有给 `gost` 做通用映射。

这意味着：

- 部分 XBoard 订阅模板并不支持 heki 已适配的全部 `gost` 模式。
- 对 `websocket / wss / mws / mwss / http2 / h2c / grpc / tls / mtls / kcp / pht / phts / quic` 这批模式，不要把这些模板当成“完整下发”格式。
- 如果客户端必须使用这些生态，建议优先换订阅模板；只有在你自己维护面板模板时，才值得继续给这些格式逐个补客户端专用语法。

## 先不改面板源码时的填写建议

如果你暂时不准备改 XBoard，本地能立刻生效的办法只有一个：把所有布尔参数都写成显式 `=true`。这条对 `clash` / `stash` 特别重要；即使你同时兼容 `meta`、`surge`、`shadowrocket` 等多种模板，统一显式写值也最稳。

建议这样写：

- `mode=websocket;tls=true;host=cdn.example.com;path=/ws`
- `key=secret;crypt=aes;mode=fast;nocomp=true`
- `mode=kcp;kcp.key=secret;kcp.crypt=aes;kcp.mode=fast;kcp.nocomp=true;kcp.tcp=true`
- `mode=quic;quic.enableDatagram=true`

不建议继续写：

- `mode=websocket;tls;host=cdn.example.com;path=/ws`
- `mode=fast;nocomp`
- `mode=kcp;kcp.tcp`

## 哪些订阅格式相对更稳

按当前模板行为来看，可以直接分成四档：

- 第一梯队：`flag=general` / `sagernet` / `v2rayn` / `v2rayng` / `passwall` / `ssrplus`
  对应 `Xboard/app/Protocols/General.php`，会直接透传整段 `plugin;plugin_opts`
- 第一梯队：`flag=shadowrocket`
  对应 `Xboard/app/Protocols/Shadowrocket.php`，也会直接透传原始 `plugin_opts`
- 第一梯队：`flag=sing-box`
  对应 `Xboard/app/Protocols/SingBox.php`，会直接带出 `plugin` / `plugin_opts`
- 第二梯队：`flag=meta`
  无值 flag 能保留，但仍属于结构化转换
- 第三梯队：`flag=clash` / `flag=stash`
  只要你把布尔参数统一写成 `=true`，大多数常见场景还能用；但别指望它们完整表达所有 `gost` 细节
- 不建议作为完整 `gost` 主订阅：`flag=surge` / `flag=loon` / `flag=quantumultx` / `flag=surfboard`
  这些模板主要只照顾 `obfs`，不适合作为“heki 已适配的全部 gost 模式”对外主推格式
- 不建议作为 SS 插件或 SS2022 主订阅：`flag=shadowsocks`
  SIP008 本身就没带 `plugin` / `plugin_opts`

另外补一个 SS2022 细节：

- `flag=surge`
  当前代码只放行 `2022-blake3-aes-128-gcm` 和 `2022-blake3-aes-256-gcm`，没有放行 `2022-blake3-chacha20-poly1305`
- `flag=clash`
  当前代码只放行传统 AEAD cipher，不适合拿来做 SS2022 订阅
- `flag=surfboard`
  当前代码已经放行 `2022-blake3-aes-128-gcm`、`2022-blake3-aes-256-gcm`、`2022-blake3-chacha20-poly1305`；但插件映射仍主要只处理 `obfs`，不适合作为完整 `gost` 主订阅

## 如果你自己维护 XBoard 源码，建议这样修

### 先补 UniProxy 的 chacha20 `server_key`

文件：

- `Xboard/app/Services/ServerService.php`

现在 `buildNodeConfig()` 里的 `server_key` 分支只覆盖了：

- `2022-blake3-aes-128-gcm`
- `2022-blake3-aes-256-gcm`

如果你用了 `2022-blake3-chacha20-poly1305`，这里要先补上：

```php
'server_key' => match ($protocolSettings['cipher']) {
        '2022-blake3-aes-128-gcm' => Helper::getServerKey($node->created_at, 16),
        '2022-blake3-aes-256-gcm',
        '2022-blake3-chacha20-poly1305' => Helper::getServerKey($node->created_at, 32),
        default => null
    }
```

不补这一处的话，heki 虽然已经支持解析 `server_key`，但面板根本没有把 chacha20 对应的值下发出来。

### 再补 SIP008 的插件字段和 2022 cipher

文件：

- `Xboard/app/Protocols/Shadowsocks.php`

这里建议补两件事：

1. `handle()` 里的 cipher 白名单补上 2022 系列
2. `SIP008()` 把 `plugin` / `plugin_opts` 一起输出

可以按下面这个思路改：

```php
$config = [
    "id" => $server['id'],
    "remarks" => $server['name'],
    "server" => $server['host'],
    "server_port" => $server['port'],
    "password" => $server['password'],
    "method" => data_get($server, 'protocol_settings.cipher'),
];

if (data_get($server, 'protocol_settings.plugin')) {
    $config['plugin'] = data_get($server, 'protocol_settings.plugin');
    $config['plugin_opts'] = data_get($server, 'protocol_settings.plugin_opts');
}
```

### 给 `clash` / `stash` 保留无值参数

文件：

- `Xboard/app/Protocols/Clash.php`
- `Xboard/app/Protocols/Stash.php`

把当前“没有 `=` 就直接丢掉”的逻辑，改成保留为 `"true"`：

```php
->mapWithKeys(function ($pair) {
    if (!str_contains($pair, '=')) {
        return [trim($pair) => 'true'];
    }
    [$key, $value] = explode('=', $pair, 2);
    return [trim($key) => trim($value)];
})
```

这样 `tls`、`nocomp`、`tcp` 这类 flag 就不会在 `clash` / `stash` 里消失。

`ClashMeta.php` 当前已经会把无值参数保留为 `true`，这一步通常不用再改。

### `surge` / `loon` / `quantumultx` / `surfboard` 不是简单补 `true` 就够了

这几类模板的问题不是“无值参数被吞掉”这么简单，而是当前代码基本只对 `obfs` 做了客户端格式映射。

如果你真要让这些模板完整支持 `gost`，需要做的是：

- 按各客户端自己的 SS 插件语法，给 `gost` 单独补分支
- 或者直接引导用户切换到 `general` / `shadowrocket` / `sing-box` / `meta`

如果你只想尽快稳定下发，不建议在这几类模板上继续硬补。

### simple-obfs 的路径顺手补一个兼容回退

同样还是这些协议模板里，很多地方只读了 `path`，没兼容 `obfs-uri`。

如果你想从面板直接往 Clash / Surge / Loon 这类模板下发 Simple Obfs 路径，建议把：

```php
$parsedOpts['path']
```

改成：

```php
$parsedOpts['path'] ?? $parsedOpts['obfs-uri'] ?? null
```

## heki 这一侧已经对齐的位置

为了避免把锅甩错方向，这里把 heki 这边已经对上的位置也列一下：

- `panel/xboard.go`
  `parseSSConfig()` 已支持从 XBoard UniProxy config 解析 `plugin`、`plugin_opts`、`server_key`
- `config/ss_plugin.go`
  `ParseSSPluginOpts()` 已支持无值参数，像 `tls` 会被解析成 `true`
- `config/ss_plugin_test.go`
  已覆盖 `gost / kcptun / pht / quic / grpc / websocket` 等 plugin 配置解析
- `panel/panel_test.go`
  已覆盖 XBoard plugin / plugin_opts 到 heki 自定义配置的转换测试

## 实际接入建议

如果你现在只是想先把业务接起来，最省事的做法还是这四条：

1. 面板里所有布尔插件参数都写成 `=true`
2. SS 插件订阅优先用 `flag=general` / `sagernet` / `v2rayn` / `v2rayng`、`flag=shadowrocket`、`flag=sing-box`
3. 不把 `flag=shadowsocks` 当成 SS 插件和 SS2022 的主订阅格式
4. 如果节点 cipher 用的是 `2022-blake3-chacha20-poly1305`，先给 `ServerService.php` 补上 `server_key` 再联调

如果你自己维护 XBoard 源码，把上面几处一并补掉，后面会省很多排障时间。
