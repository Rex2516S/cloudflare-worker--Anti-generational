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


//此代码由AI生成
