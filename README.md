这是一个非常典型的跨账号配置需求。由于 Cloudflare 的安全机制，你**不能直接**在账号 A 的 Workers 设置里绑定账号 B 下的域名。

Cloudflare 要求 Workers 的自定义域名必须在**同一个账号**的 DNS 区域（Zone）内。

你有以下两种主要解决方案，按推荐程度排序：

### 方案一：使用“中转 Worker”（最推荐，无需迁移域名）

这是最灵活的方法。既然域名在账号 B，你可以在账号 B 里创建一个简单的 Worker，把流量“反向代理”到账号 A 的 Worker。

**步骤如下：**

1.  **在账号 A（有 Worker 的账号）：**
    *   确保你的 Worker 已经发布，并获得了一个 `*.workers.dev` 的默认子域名地址（例如：`app-v1.account-a.workers.dev`）。

2.  **在账号 B（有域名的账号）：**
    *   创建一个新的 Worker（我们称之为“中转 Worker”）。
    *   点击 **“编辑代码” (Edit Code)**，填入以下代码。这段代码的作用是将所有请求原封不动地转发给账号 A 的 Worker：

    ```javascript
    export default {
      async fetch(request, env, ctx) {
        // 将这里替换为你账号 A 中 Worker 的实际地址
        const TARGET_URL = "https://app-v1.account-a.workers.dev";

        const url = new URL(request.url);
        const targetUrl = new URL(TARGET_URL);

        // 替换目标 URL 的 Host 和 Path
        url.hostname = targetUrl.hostname;
        
        // 构建新的 Request 对象
        // 注意：这里我们保留了原始请求的方法、Headers 和 Body
        const newRequest = new Request(url.toString(), {
            method: request.method,
            headers: request.headers,
            body: request.body,
            redirect: 'follow'
        });

        // 发起请求并返回结果
        return fetch(newRequest);
      }
    };
    ```

    *   **保存并部署**这个中转 Worker。
    *   在这个中转 Worker 的设置页面，找到 **Triggers (触发器) -> Custom Domains (自定义域名)**。
    *   添加你想要的域名（例如 `api.your-domain.com`）。

**优缺点：**
*   **优点**：不需要迁移域名，两个账号保持独立。
*   **缺点**：理论上会产生双倍的 Worker 调用次数（账号 B 计费一次，账号 A 计费一次），但在免费额度内通常不是问题。

---

### 方案二：将域名转移到账号 A（最彻底）

如果你希望管理方便，且没有特殊理由将域名留在账号 B，最好的办法是将域名直接转移到账号 A。

**步骤如下：**

1.  登录账号 B，删除该域名的站点（或者直接去注册商修改 Nameservers）。
2.  登录账号 A，点击 "Add a Site"（添加站点），输入你的域名。
3.  Cloudflare 会给你两个新的 Nameservers（名称服务器）。
4.  去你的域名注册商（如 Godaddy, Namecheap, 阿里云等），把 Nameservers 修改为账号 A 提供的。
5.  等待 DNS 生效后，直接在账号 A 的 Worker 设置里绑定该域名。

**优缺点：**
*   **优点**：原生支持，性能最好，管理集中。
*   **缺点**：需要修改 DNS 设置，可能会导致短暂的解析中断；如果账号 B 还有其他服务依赖该域名，配置会很麻烦。

---

### ❌ 为什么不能直接用 CNAME？（常见误区）

你可能会想：*“我能不能直接在账号 B 的 DNS 里加一个 CNAME 记录，指向账号 A 的 `*.workers.dev` 地址？”*

**答案是：不可以。**

如果你这样做，访问域名时通常会看到 **Error 1001 (DNS Resolution Error)**。
这是因为 Cloudflare 的边缘节点接收到你的域名请求（例如 `api.yoursite.com`）时，它会去查找该域名绑定的 Worker。由于该域名在账号 B，但 Worker 在账号 A，且没有进行绑定关联，Cloudflare 会出于安全考虑拒绝服务，防止有人恶意将别人的域名指向自己的 Worker。

**总结：** 请使用 **方案一**，在账号 B 建一个简单的“中转 Worker”是最快的解决办法。
