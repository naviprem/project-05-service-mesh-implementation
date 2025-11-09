# Implementation Plan: Service Mesh Implementation

## Overview
Deploy a microservices e-commerce application with Istio service mesh to implement traffic management, security (mTLS), and observability (tracing, metrics).

## Architecture
```
Istio Ingress Gateway → Product Service → Cart Service
                     ↓                  ↓
                User Service ← Order Service
                     ↓
                Database (PostgreSQL)
```

## Step-by-Step Implementation

### Phase 1: Microservices Application (1.5 hours)

#### Step 1: Create Microservices (45 mins)

**services/product-service/** (Node.js)
- GET /products - List products
- GET /products/:id - Get product details
- Port 3001

**services/cart-service/** (Python Flask)
- GET /cart/:userId - Get user cart
- POST /cart/:userId - Add to cart
- DELETE /cart/:userId/:itemId - Remove from cart
- Calls product-service to get product details
- Port 3002

**services/order-service/** (Go)
- POST /orders - Create order
- GET /orders/:userId - Get user orders
- Calls cart-service to get cart
- Calls user-service to validate user
- Port 3003

**services/user-service/** (Node.js)
- GET /users/:id - Get user info
- POST /users - Create user
- Port 3004

Each service includes:
- Dockerfile
- Health endpoint (/health)
- Ready endpoint (/ready)
- Environment-based config
- Simple logging

#### Step 2: Create Kubernetes Manifests (30 mins)

For each service, create:
- **k8s/[service]-deployment.yaml**: Deployment with 2 replicas
- **k8s/[service]-service.yaml**: ClusterIP service

#### Step 3: Test Without Service Mesh (15 mins)
```bash
# Start minikube or create EKS cluster
eksctl create cluster --name servicemesh-demo --region us-east-1 --nodes 3

# Deploy services
kubectl apply -f k8s/

# Test service communication
kubectl run test --rm -it --image=curlimages/curl -- sh
curl http://product-service:3001/products
```

### Phase 2: Install and Configure Istio (1 hour)

#### Step 4: Install Istio (20 mins)
```bash
# Download Istio
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.20.0  # or latest version
export PATH=$PWD/bin:$PATH

# Install with demo profile
istioctl install --set profile=demo -y

# Verify installation
kubectl get pods -n istio-system

# Expected pods:
# - istiod (control plane)
# - istio-ingressgateway
# - istio-egressgateway
```

#### Step 5: Enable Sidecar Injection (10 mins)
```bash
# Create namespace with auto-injection
kubectl create namespace ecommerce
kubectl label namespace ecommerce istio-injection=enabled

# Verify label
kubectl get namespace ecommerce --show-labels

# Redeploy services to ecommerce namespace
kubectl apply -f k8s/ -n ecommerce

# Verify sidecars injected (should see 2/2 containers)
kubectl get pods -n ecommerce
```

#### Step 6: Install Observability Tools (30 mins)
```bash
# Install Prometheus
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml

# Install Grafana
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml

# Install Jaeger for tracing
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/jaeger.yaml

# Install Kiali for visualization
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml

# Wait for pods to be ready
kubectl get pods -n istio-system -w

# Access dashboards (in separate terminals)
istioctl dashboard kiali
istioctl dashboard grafana
istioctl dashboard jaeger
```

### Phase 3: Traffic Management (1 hour)

#### Step 7: Configure Gateway and VirtualServices (30 mins)

**istio/gateway.yaml**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: ecommerce-gateway
  namespace: ecommerce
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "*"
```

**istio/product-virtualservice.yaml**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service
  namespace: ecommerce
spec:
  hosts:
  - "*"
  gateways:
  - ecommerce-gateway
  http:
  - match:
    - uri:
        prefix: "/products"
    route:
    - destination:
        host: product-service
        port:
          number: 3001
```

Create similar VirtualServices for other services.

#### Step 8: Deploy Multiple Versions (Canary) (30 mins)

**Deploy v2 of product-service:**
```bash
# Build v2 with different response (e.g., adds "SALE" badge)
docker build -t product-service:v2 ./services/product-service

# Create deployment for v2
kubectl apply -f k8s/product-service-v2-deployment.yaml -n ecommerce
```

**istio/product-canary.yaml**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service
  namespace: ecommerce
spec:
  hosts:
  - product-service
  http:
  - match:
    - headers:
        user-type:
          exact: "vip"
    route:
    - destination:
        host: product-service
        subset: v2
  - route:
    - destination:
        host: product-service
        subset: v1
      weight: 90
    - destination:
        host: product-service
        subset: v2
      weight: 10
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: product-service
  namespace: ecommerce
spec:
  host: product-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

```bash
# Apply canary config
kubectl apply -f istio/product-canary.yaml

# Test: 90% traffic to v1, 10% to v2
for i in {1..100}; do curl http://<GATEWAY_IP>/products; done
```

### Phase 4: Security with mTLS (30 mins)

#### Step 9: Enable Strict mTLS (15 mins)

**istio/mtls-strict.yaml**
```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: ecommerce
spec:
  mtls:
    mode: STRICT
```

```bash
# Apply mTLS policy
kubectl apply -f istio/mtls-strict.yaml

# Verify mTLS is active
istioctl proxy-config endpoint <product-pod> -n ecommerce | grep product-service
```

#### Step 10: Test mTLS Enforcement (15 mins)
```bash
# Try to access from pod without sidecar (should fail)
kubectl run test --rm -it --image=curlimages/curl --namespace default -- \
  curl http://product-service.ecommerce.svc.cluster.local:3001/products
# Expected: Connection refused or timeout

# Access from pod with sidecar (should work)
kubectl run test --rm -it --image=curlimages/curl --namespace ecommerce -- \
  curl http://product-service:3001/products
# Expected: Success
```

### Phase 5: Resilience Patterns (45 mins)

#### Step 11: Configure Circuit Breaking (15 mins)

**istio/circuit-breaker.yaml**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: cart-service-circuit-breaker
  namespace: ecommerce
spec:
  host: cart-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 10
      http:
        http1MaxPendingRequests: 1
        maxRequestsPerConnection: 2
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

```bash
kubectl apply -f istio/circuit-breaker.yaml

# Load test to trigger circuit breaker
kubectl run fortio --image=fortio/fortio -- load -c 3 -qps 0 -n 50 http://cart-service:3002/cart/user1
```

#### Step 12: Add Retries and Timeouts (15 mins)

**istio/retry-timeout.yaml**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
  namespace: ecommerce
spec:
  hosts:
  - order-service
  http:
  - route:
    - destination:
        host: order-service
    timeout: 5s
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx,reset,connect-failure
```

#### Step 13: Fault Injection (15 mins)

**istio/fault-injection.yaml**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: cart-service-fault
  namespace: ecommerce
spec:
  hosts:
  - cart-service
  http:
  - fault:
      delay:
        percentage:
          value: 50.0
        fixedDelay: 5s
      abort:
        percentage:
          value: 10.0
        httpStatus: 500
    route:
    - destination:
        host: cart-service
```

```bash
# Apply fault injection
kubectl apply -f istio/fault-injection.yaml

# Test and observe retries/timeouts in Kiali
curl http://<GATEWAY_IP>/cart/user1
```

### Phase 6: Observability Deep Dive (30 mins)

#### Step 14: Distributed Tracing (15 mins)
```bash
# Generate traffic
for i in {1..50}; do
  curl http://<GATEWAY_IP>/products
  curl http://<GATEWAY_IP>/cart/user1
  curl -X POST http://<GATEWAY_IP>/orders
done

# Open Jaeger
istioctl dashboard jaeger

# Explore:
# - End-to-end traces across services
# - Service dependencies
# - Latency breakdown
# - Error traces
```

#### Step 15: Metrics and Dashboards (15 mins)
```bash
# Open Grafana
istioctl dashboard grafana

# Explore dashboards:
# - Istio Service Dashboard: Request rate, latency, errors
# - Istio Workload Dashboard: Per-pod metrics
# - Istio Performance Dashboard: Proxy overhead

# Open Kiali
istioctl dashboard kiali

# Explore:
# - Service graph with traffic flow
# - Health indicators
# - Traffic metrics
# - Configuration validation
```

## Project Structure
```
project-05-service-mesh-implementation/
├── services/
│   ├── product-service/
│   │   ├── server.js
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── cart-service/
│   │   ├── app.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   ├── order-service/
│   │   ├── main.go
│   │   ├── go.mod
│   │   └── Dockerfile
│   └── user-service/
│       ├── server.js
│       ├── package.json
│       └── Dockerfile
├── k8s/
│   ├── product-deployment.yaml
│   ├── product-service.yaml
│   ├── cart-deployment.yaml
│   ├── cart-service.yaml
│   ├── order-deployment.yaml
│   ├── order-service.yaml
│   ├── user-deployment.yaml
│   └── user-service.yaml
├── istio/
│   ├── gateway.yaml
│   ├── product-virtualservice.yaml
│   ├── product-canary.yaml
│   ├── mtls-strict.yaml
│   ├── circuit-breaker.yaml
│   ├── retry-timeout.yaml
│   └── fault-injection.yaml
├── load-test/
│   └── generate-traffic.sh
└── README.md
```

## Key Service Mesh Concepts Demonstrated

1. **Sidecar Injection**: Envoy proxy alongside each service
2. **Traffic Management**:
   - Gateway: Entry point to mesh
   - VirtualService: Routing rules
   - DestinationRule: Load balancing, subsets
3. **Canary Deployments**: Traffic splitting between versions
4. **mTLS**: Automatic encryption between services
5. **Circuit Breaking**: Prevent cascade failures
6. **Retries/Timeouts**: Resilience patterns
7. **Fault Injection**: Chaos testing
8. **Distributed Tracing**: End-to-end request visibility
9. **Service Graph**: Visualize dependencies

## Testing Checklist

- [ ] All services deployed with sidecars (2/2 containers)
- [ ] Services can communicate through mesh
- [ ] Gateway routes external traffic
- [ ] Canary deployment splits traffic correctly
- [ ] VIP users get v2, others get 90/10 split
- [ ] mTLS enforced (non-mesh pods can't access)
- [ ] Circuit breaker triggers under load
- [ ] Retries work on transient failures
- [ ] Fault injection causes delays/errors
- [ ] Traces visible in Jaeger showing all hops
- [ ] Kiali shows service graph
- [ ] Grafana dashboards show mesh metrics

## Cleanup
```bash
# Delete Istio addons
kubectl delete -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml
kubectl delete -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
kubectl delete -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/jaeger.yaml
kubectl delete -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml

# Uninstall Istio
istioctl uninstall --purge -y

# Delete namespace
kubectl delete namespace ecommerce istio-system

# Delete cluster
eksctl delete cluster --name servicemesh-demo
```

## Time Estimate
- Microservices creation: 1.5 hours
- Istio installation: 1 hour
- Traffic management: 1 hour
- Security: 30 mins
- Resilience: 45 mins
- Observability: 30 mins
- **Total: 5-6 hours**
