# tls 加密套件配置

# 支持的加密套件

>请自行了解什么是 tls 加密套件，不熟悉则不要乱动，保持默认即可

> 所有协议只要启用了 tls 均支持配置 tls 加密套件

```
套件名                                            套件 id

TLS_RSA_WITH_3DES_EDE_CBC_SHA                    0xa
TLS_RSA_WITH_AES_128_CBC_SHA                     0x2f
TLS_RSA_WITH_AES_256_CBC_SHA                     0x35
TLS_RSA_WITH_AES_128_GCM_SHA256                  0x9c
TLS_RSA_WITH_AES_256_GCM_SHA384                  0x9d
TLS_AES_128_GCM_SHA256                           0x1301
TLS_AES_256_GCM_SHA384                           0x1302
TLS_CHACHA20_POLY1305_SHA256                     0x1303
TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA             0xc009
TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA             0xc00a
TLS_ECDHE_RSA_WITH_3DES_EDE_CBC_SHA              0xc012
TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA               0xc013
TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA               0xc014
TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256          0xc02b
TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384          0xc02c
TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256            0xc02f
TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384            0xc030
TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256      0xcca8
TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256    0xcca9
```

# 配置方式

> 以`:`分隔每个套件名或套件 id

## 1.使用套件 id

```
tls_cipher_suites=0xcca8:0xc030:0xc02f
```

## 2. 使用套件名

```
tls_cipher_suites=TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
```
