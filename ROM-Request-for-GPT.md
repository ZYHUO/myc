# 任务：下载 ROM 文件并通过 GitHub Release 转发

你好，我需要你帮我下载几个 ROM 文件，并把它们上传到 GitHub Release，因为我在用的另一个 AI 助手（在受限沙箱里）无法访问 SourceForge 和 xiaomi.eu，但可以从 GitHub Release 下载。

## 一、需要下载的三个文件

### 文件 1：Blooming A3 GSI

- **来源 URL**：https://sourceforge.net/projects/divarelease/files/gsi_phone_arm64_Blooming_A3/
- **选择规则**：进入该目录后，挑选满足以下条件的文件：
  - 架构：**arm64**
  - 分区：**a/b**（不要 a-only）
  - 变种：**vanilla**（不带 GApps，文件名通常含 `vanilla` 或不含 `gapps`）
  - 版本：**最新的 stable**
- **典型文件名**：`system-blooming_a3-arm64-ab-vanilla.img.xz` 或类似命名
- **附加文件**：如果该目录里有对应的 `.md5`、`README`、`changelog` 文本文件，一起下载

### 文件 2：MIUI EU for Redmi K40（Fastboot ROM）

- **设备代号**：`alioth`（Redmi K40，骁龙 870）
- **来源**：
  - 主站：https://xiaomi.eu/community/forums/xiaomi-eu-multilang-miui-roms.155/
  - 或 Telegram 频道：https://t.me/xiaomieu_official
- **选择规则**：alioth 设备的**最新稳定版**（latest stable）的 **Fastboot ROM**
- **文件类型**：`.tgz`（约 5–7 GB）
- **典型文件名**：`alioth_eea_global_images_Vxxx.x.x.x.x.LATEST_xx.x.x.tgz`

### 文件 3：MIUI EU for alioth（Recovery / 卡刷包）

- 同样来源，与文件 2 **同一个版本号**的 **Recovery zip**（卡刷包）
- **文件类型**：`.zip`（约 5–6 GB）
- **典型文件名**：`miui_ALIOTHEEAGlobal_Vxxx.x.x.x.x.LATEST_xxxxxxxxxx_xx.x.zip`

---

## 二、上传到 GitHub Release 的步骤

GitHub Release 单文件上限是 **2 GiB**，所以大文件必须切片。

### 步骤 1：切大文件

在本地（Linux / macOS / WSL）执行：

```bash
# 切 fastboot tgz（>2GB）
split -b 1900M alioth_eea_global_images_xxx.tgz alioth_fastboot.tgz.part-

# 切 recovery zip（>2GB）
split -b 1900M miui_ALIOTHEEAGlobal_xxx.zip alioth_recovery.zip.part-

# GSI 的 .img.xz 一般 < 2GB，不用切
```

如果用 Windows，可以用 7-Zip 的"分卷压缩"功能，每卷 1900 MB（不要重新压缩，只切分）。

### 步骤 2：生成校验和

```bash
sha256sum \
  system-blooming_a3-arm64-ab-vanilla.img.xz \
  alioth_eea_global_images_xxx.tgz \
  miui_ALIOTHEEAGlobal_xxx.zip \
  alioth_fastboot.tgz.part-* \
  alioth_recovery.zip.part-* \
  > SHA256SUMS.txt
```

（无法对原文件计算的话，至少对所有 part 文件计算）

### 步骤 3：上传到 GitHub Release

1. 新建一个**公开**仓库，比如 `rom-relay`
2. 进入仓库 → Releases → "Draft a new release"
3. Tag 名随意，比如 `v1`
4. 把以下所有文件作为 release assets 上传：
   - `system-blooming_a3-arm64-ab-vanilla.img.xz`（GSI 原文件）
   - `alioth_fastboot.tgz.part-aa`、`alioth_fastboot.tgz.part-ab`、…（fastboot 切片）
   - `alioth_recovery.zip.part-aa`、`alioth_recovery.zip.part-ab`、…（recovery 切片）
   - `SHA256SUMS.txt`
   - 任何 changelog / README 文本
5. 点击 "Publish release"

---

## 三、上传完成后给我以下信息

请把下面这段填好回复给我（我会把这段转给我的另一个 AI）：

```
仓库地址：https://github.com/<owner>/<repo>
Release tag：<tag>
Release URL：https://github.com/<owner>/<repo>/releases/tag/<tag>

文件列表：
- GSI: <实际文件名>
- Fastboot 切片数量：N 个，前缀 alioth_fastboot.tgz.part-
- Recovery 切片数量：N 个，前缀 alioth_recovery.zip.part-
- 原始 fastboot 文件名（合并后用）：<原 .tgz 文件名>
- 原始 recovery 文件名（合并后用）：<原 .zip 文件名>
- 校验文件：SHA256SUMS.txt
```

---

## 四、注意事项

- **不要重新压缩**任何文件，只做"切片"（split / 分卷），否则会损坏
- **MIUI EU 不在主站直接放下载链**，是在论坛帖子里或 Telegram 频道发，可能需要注册账号或加入频道
- 如果 xiaomi.eu 主站打不开，可以用镜像 `https://sd-mirror.xiaomi.eu/` 或者从 Telegram `@xiaomieu_official` 频道里找最新发布的 alioth 包
- alioth 的 EU 包目前最新基本停留在 **HyperOS 1（Android 14）**，没有更新的，按你能找到的最新稳定版下即可
- 文件比较大（合计约 12–15 GB），下载和上传需要时间和带宽

谢谢！
