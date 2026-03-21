const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";

export class DeepSeekConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeepSeekConfigError";
  }
}

export function getDeepSeekConfig() {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY?.trim() || "",
    baseURL:
      process.env.DEEPSEEK_BASE_URL?.trim() || DEFAULT_DEEPSEEK_BASE_URL,
    model: process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_DEEPSEEK_MODEL,
  };
}

export function getRequiredDeepSeekConfig() {
  const config = getDeepSeekConfig();

  if (!config.apiKey) {
    throw new DeepSeekConfigError(
      "缺少 DeepSeek API 配置，请在服务端环境变量中设置 DEEPSEEK_API_KEY。"
    );
  }

  return config;
}
