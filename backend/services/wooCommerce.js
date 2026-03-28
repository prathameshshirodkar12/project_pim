const axios = require('axios');
const crypto = require('crypto');

const getWooConfig = () => {
  const baseUrl = process.env.WOO_BASE_URL;
  const consumerKey = process.env.WOO_CONSUMER_KEY;
  const consumerSecret = process.env.WOO_CONSUMER_SECRET;

  const isConfigured = Boolean(baseUrl && consumerKey && consumerSecret);

  return {
    isConfigured,
    baseUrl,
    auth: {
      username: consumerKey,
      password: consumerSecret
    }
  };
};

const encode = (value) =>
  encodeURIComponent(String(value))
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

const buildOAuthParams = (consumerKey, consumerSecret, method, requestUrl, queryParams = {}) => {
  const url = new URL(requestUrl);
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString()
  };

  const allParams = {};

  url.searchParams.forEach((value, key) => {
    allParams[key] = value;
  });

  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      allParams[key] = value;
    }
  });

  Object.entries(oauthParams).forEach(([key, value]) => {
    allParams[key] = value;
  });

  const normalizedParams = Object.keys(allParams)
    .sort()
    .map((key) => `${encode(key)}=${encode(allParams[key])}`)
    .join('&');

  const baseUrl = `${url.origin}${url.pathname}`;
  const signatureBaseString = [method.toUpperCase(), encode(baseUrl), encode(normalizedParams)].join('&');
  const signingKey = `${encode(consumerSecret)}&`;
  const oauthSignature = crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64');

  return {
    ...oauthParams,
    oauth_signature: oauthSignature
  };
};

const buildWooPayload = (product) => ({
  name: product.name,
  type: 'simple',
  regular_price: String(product.price),
  description: product.description,
  categories: product.category ? [{ name: product.category }] : [],
  stock_quantity: product.stock,
  manage_stock: true,
  attributes: [
    { name: 'Size', options: product.attributes?.size ? [product.attributes.size] : [] },
    { name: 'Color', options: product.attributes?.color ? [product.attributes.color] : [] }
  ].filter((attribute) => attribute.options.length > 0)
});

const formatWooError = (error) => {
  if (error.response?.data) {
    return error.response.data;
  }

  return error.message;
};

const requestWoo = async ({ method, url, consumerKey, consumerSecret, data, params }) => {
  const isHttps = url.startsWith('https://');

  if (isHttps) {
    return axios({
      method,
      url,
      data,
      params,
      auth: {
        username: consumerKey,
        password: consumerSecret
      }
    });
  }

  const oauthParams = buildOAuthParams(consumerKey, consumerSecret, method, url, params);

  return axios({
    method,
    url,
    data,
    params: {
      ...params,
      ...oauthParams
    }
  });
};

const createWooProduct = async (product) => {
  const config = getWooConfig();
  if (!config.isConfigured) {
    return { skipped: true, reason: 'WooCommerce credentials are not configured.' };
  }

  const response = await requestWoo({
    method: 'post',
    url: `${config.baseUrl}/products`,
    consumerKey: config.auth.username,
    consumerSecret: config.auth.password,
    data: buildWooPayload(product)
  });

  return { skipped: false, data: response.data };
};

const updateWooProduct = async (wooProductId, product) => {
  const config = getWooConfig();
  if (!config.isConfigured) {
    return { skipped: true, reason: 'WooCommerce credentials are not configured.' };
  }

  if (!wooProductId) {
    return { skipped: true, reason: 'No WooCommerce product is linked to this item.' };
  }

  const response = await requestWoo({
    method: 'put',
    url: `${config.baseUrl}/products/${wooProductId}`,
    consumerKey: config.auth.username,
    consumerSecret: config.auth.password,
    data: buildWooPayload(product)
  });

  return { skipped: false, data: response.data };
};

const deleteWooProduct = async (wooProductId) => {
  const config = getWooConfig();
  if (!config.isConfigured) {
    return { skipped: true, reason: 'WooCommerce credentials are not configured.' };
  }

  if (!wooProductId) {
    return { skipped: true, reason: 'No WooCommerce product is linked to this item.' };
  }

  const response = await requestWoo({
    method: 'delete',
    url: `${config.baseUrl}/products/${wooProductId}`,
    consumerKey: config.auth.username,
    consumerSecret: config.auth.password,
    params: { force: true }
  });

  return { skipped: false, data: response.data };
};

module.exports = {
  createWooProduct,
  updateWooProduct,
  deleteWooProduct,
  formatWooError
};
