export type HttpClientOptions = RequestInit & {
  params?: Record<string, string>;
};

// biome-ignore lint/suspicious/noExplicitAny: this is a fallback type
export interface HttpResponse<T = any> extends Response {
  json(): Promise<T>;
}

export class HttpClientException extends Error {
  constructor(public response: HttpResponse) {
    super(`Request failed with status code ${response.status}`);
  }
}

class HttpClient {
  // biome-ignore lint/suspicious/noExplicitAny: this is a fallback type
  async request<R = any>(url: string, options: HttpClientOptions = {}): Promise<HttpResponse<R>> {
    const paramsToString = new URLSearchParams(options?.params).toString();
    const urlWithParams = paramsToString ? `${url}?${paramsToString}` : url;
    if (options.body && typeof options.body === 'string') {
      options.headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
    }
    const response = await fetch(urlWithParams, options);
    if (!response.ok) {
      throw new HttpClientException(response);
    }
    return response as HttpResponse<R>;
  }

  // biome-ignore lint/suspicious/noExplicitAny: this is a fallback type
  get<R = any>(
    url: string,
    options?: Omit<HttpClientOptions, 'body' | 'method'>,
  ): Promise<HttpResponse<R>> {
    return this.request<R>(url, { ...options, method: 'GET' });
  }

  // biome-ignore lint/suspicious/noExplicitAny: this is a fallback type
  post<T = any, R = any>(
    url: string,
    body: T,
    options?: Omit<HttpClientOptions, 'body' | 'method'>,
  ): Promise<HttpResponse<R>> {
    return this.request<R>(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // biome-ignore lint/suspicious/noExplicitAny: this is a fallback type
  put<T = any, R = any>(
    url: string,
    body: T,
    options?: Omit<HttpClientOptions, 'body' | 'method'>,
  ): Promise<HttpResponse<R>> {
    return this.request<R>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  // biome-ignore lint/suspicious/noExplicitAny: this is a fallback type
  patch<T = any, R = any>(
    url: string,
    body: T,
    options?: Omit<HttpClientOptions, 'body' | 'method'>,
  ): Promise<HttpResponse<R>> {
    return this.request<R>(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  // biome-ignore lint/suspicious/noExplicitAny: this is a fallback type
  delete<R = any>(
    url: string,
    options?: Omit<HttpClientOptions, 'body' | 'method'>,
  ): Promise<HttpResponse<R>> {
    return this.request<R>(url, { ...options, method: 'DELETE' });
  }
}

export const httpClient = new HttpClient();
