import { group, check } from 'k6'
import http from 'k6/http'
import * as helper from './helper.js';
import { SharedArray } from "k6/data";
import { Counter } from "k6/metrics";

const userData = new SharedArray("Test User Data", function () {
  return JSON.parse(open('users.json')).users;
});
let errors = new Counter("errors");

export const options = {
  cloud: {
    distribution: { 'amazon:de:frankfurt': { loadZone: 'amazon:de:frankfurt', percent: 100 } },
  },
  scenarios: {
    Scenario_1: {
      executor: 'ramping-vus',
      stages: [
        { target: 5, duration: '30s' },
        { target: 5, duration: '30s' },
        { target: 0, duration: '30s' },
      ],
      exec: 'ecommerceStoreLogin',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<5000'],
  },
}

export function ecommerceStoreLogin() {
  let randomUserScenario = helper.getRandomNumber()
  let randomUserNumber = helper.getRandomUserNumber()

  const BASE_URL = 'https://ecommercestore.fly.dev';
  const EMAIL = userData[randomUserNumber].email
  const PASSWORD = userData[randomUserNumber].password

  let getMainPageRequest = {
    method: 'GET',
    url: BASE_URL,
    params: {
      tags: {
        name: 'GET - Main Page',
      },
    },
  }

  let getProductsRequest = {
    method: 'GET',
    url: `${BASE_URL}/api/products?pageNumber=&seller=&name=&category=&min=0&max=0&rating=0&order=`,
    params: {
      tags: {
        name: 'GET - Products',
      },
    },
  }

  let getUsersTopSellersRequest = {
    method: 'GET',
    url: `${BASE_URL}/api/users/top-sellers`,
    params: {
      tags: {
        name: 'GET - Top Sellers',
      },
    },
  }

  let getProductsCategoriesRequest = {
    method: 'GET',
    url: `${BASE_URL}/api/products/categories`,
    params: {
      tags: {
        name: 'GET - Products Categories',
      },
    },
  }

  let postUsersSignInRequest = {
    method: 'POST',
    url: `${BASE_URL}/api/users/signin`,
    body: `{"email": "${EMAIL}","password":"${PASSWORD}"}`,
    params: {
      headers: {
        "content-type": 'application/json',
      },
      tags: {
        name: 'POST - User Sign In',
      },
    }
  }

  function getOrdersRequest(token) {
    return {
      method: 'GET',
      url: `${BASE_URL}/api/orders/mine`,
      params: {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        tags: {
          name: 'GET - Orders Request',
        },
      }
    }
  }

  let getProductRequest = {
    method: 'GET',
    url: `${BASE_URL}/api/products/688fd31ab314f77b9732564c`,
    params: {
      tags: {
        name: 'GET - Product',
      },
    },
  }

  console.log("User Login Scenario")
  console.log(userData[randomUserNumber].id)
  group(`Main Page - ${BASE_URL}`, function () {
    const mainPageResponses = http.batch([
      getMainPageRequest,
      getProductsRequest,
      getUsersTopSellersRequest,
      getProductsCategoriesRequest,
    ]);

    const getMainPageResponseCheck = check(mainPageResponses[0], {
      'GET - Main Page response status was 200': (res) => res.status === 200,
    });
    errors.add(!getMainPageResponseCheck);

    const getProductsResponseCheck = check(mainPageResponses[1], {
      'GET - Products response status was 200': (res) => res.status === 200,
    });
    errors.add(!getProductsResponseCheck);

    const getUsersTopSellersResponseCheck = check(mainPageResponses[2], {
      'GET - Users Top Sellers response status was 200': (res) => res.status === 200,
    });
    errors.add(!getUsersTopSellersResponseCheck);

    const getProductsCategoriesResponseCheck = check(mainPageResponses[3], {
      'GET - Product Categories response status was 200': (res) => res.status === 200,
    });
    errors.add(!getProductsCategoriesResponseCheck);
  })

  let token = '';
  group(`Sign In Page - ${BASE_URL}/signin`, function () {
    const postUsersSignInResponse = http.post(postUsersSignInRequest.url, postUsersSignInRequest.body, postUsersSignInRequest.params)
    token = postUsersSignInResponse.json('token');
    const postUsersSignInResponseCheck = check(postUsersSignInResponse, {
      'POST - Users Sign In response status was 200': (res) => res.status === 200,
    });
    errors.add(!postUsersSignInResponseCheck);
  })

  group(`Main Page After User Log In - ${BASE_URL}`, function () {
    const mainPageAfterUserLogInResponses = http.batch([
      getProductsRequest,
      getUsersTopSellersRequest,
    ]);

    const getProductsResponseCheck = check(mainPageAfterUserLogInResponses[0], {
      'GET - Products response status was 200': (res) => res.status === 200,
    });
    errors.add(!getProductsResponseCheck);

    const getUsersTopSellersResponseCheck = check(mainPageAfterUserLogInResponses[1], {
      'GET - Users Top Sellers response status was 200': (res) => res.status === 200,
    });
    errors.add(!getUsersTopSellersResponseCheck);
  })

  group(`User Orders Page - ${BASE_URL}/api/orders/mine`, function () {
    const getOrdersResponse = http.get(getOrdersRequest().url, getOrdersRequest(token).params);
    const getOrdersResponseCheck = check(getOrdersResponse, {
      'GET - Orders response status was 200': (res) => res.status === 200,
    });
    errors.add(!getOrdersResponseCheck);
  })

  if (randomUserScenario <= 19.00) {
    console.log("Select Product and Add Product to Cart Scenario")
    group(`Product Page - ${BASE_URL}/api/products/688fd31ab314f77b9732564c`, function () {
      const getProductResponse = http.get(getProductRequest.url);
      const getProductResponseCheck = check(getProductResponse, {
        'GET - Product Page - Product response status was 200': (res) => res.status === 200,
      });
      errors.add(!getProductResponseCheck);
    })

    group(`Cart Page - ${BASE_URL}/api/products/688fd31ab314f77b9732564c`, function () {
      const getProductResponse = http.get(getProductRequest.url);
      const getProductResponseCheck = check(getProductResponse, {
        'GET - Cart Page - Product response status was 200': (res) => res.status === 200,
      });
      errors.add(!getProductResponseCheck);
    })
  }
}
