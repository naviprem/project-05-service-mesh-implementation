# Application Setup

- Prerequisites
  - Docker installed and running
  - kubectl configured
  - Access to a container registry (Docker Hub, ECR, etc.)
  - Text editor or IDE

- Build product-service API and test locally

```bash
cd services/product-service

# Install dependencies
npm install

# Stop pointing Docker to Minikube's Docker daemon for local testing
eval $(minikube docker-env --unset)

# Build the image
docker build -t product-service:v1 .

# Run locally
docker run -d -p 3001:3001 \
    --name product-service-test product-service:v1

# Test in another terminal
curl http://localhost:3001/health
curl http://localhost:3001/products


```

- Build cart-service API and test locally

```bash
cd services/cart-service

# Install dependencies
npm install

# Stop pointing Docker to Minikube's Docker daemon for local testing
eval $(minikube docker-env --unset)

# Build the image
docker build -t cart-service:v1 .

# Run with product service
docker run -d -p 3002:3002 \
    -e PRODUCT_SERVICE_URL=http://host.docker.internal:3001 \
    --name cart-service-test cart-service:v1

# Test in another terminal
curl http://localhost:3002/health
curl -X POST -H "Content-Type: application/json" \
  -d '{"product_id": 1, "quantity": 2}' \
  http://localhost:3002/cart/1
curl http://localhost:3002/cart/1

```

- Build user-service API and test locally

```bash
cd services/user-service

# Install dependencies
npm install

# Stop pointing Docker to Minikube's Docker daemon for local testing
eval $(minikube docker-env --unset)

docker build -t user-service:v1 .
docker run -d -p 3004:3004 --name user-service-test user-service:v1

# Test
curl http://localhost:3004/users/1
curl http://localhost:3004/users/2
```

- Build and test order-service

```bash
cd services/order-service

npm install

docker build -t order-service:v1 .
docker run -d -p 3003:3003 --name order-service-test order-service:v1

# Test
curl http://localhost:3003/health
curl -X POST -H "Content-Type: application/json" -d '{"user_id": "1"}' http://localhost:3003/orders
```
